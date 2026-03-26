# frozen_string_literal: true

# config/initializers/doorkeeper_application_did_patch.rb
#
# Enables RFC7523-style private_key_jwt client authentication for did:oyd clients
# when dc-base is started with AUTH=DID.
#
# This patch:
# - Interprets "client_assertion" (JWT) as the "secret" in Doorkeeper's client auth pipeline
# - Auto-provisions a Doorkeeper::Application per DID (uid = DID)
# - Resolves the DID to a W3C DID Document via Oydid
# - Extracts Ed25519 public keys (publicKeyMultibase) into JWKS and stores in oauth_applications.jwks
# - Verifies the client_assertion signature + required claims (iss/sub/aud/iat/exp/jti)
# - Enforces replay protection via jti cache
#
# Required:
# - AuthMode.did? helper (see config/initializers/auth_mode.rb)
# - OauthRequestContext.current.token_url set by your credentials extractor
#   (see config/initializers/doorkeeper_private_key_jwt.rb)
# - oauth_applications has columns: jwks (json/text), jwks_updated_at (datetime)

return unless defined?(AuthMode) && AuthMode.did?

require "securerandom"
require "jwt"
require "jwt/eddsa"

module DoorkeeperApplicationDidPatch
  ASSERTION_MAX_TTL_SEC = 300          # max 5 minutes between iat and exp
  JWKS_REFRESH_INTERVAL = 24.hours     # refresh stored JWKS at most every 24h
  JTI_CACHE_TTL         = 10.minutes   # keep jti cache longer than assertion ttl

  # Doorkeeper calls this to authenticate a client:
  # - uid    -> client_id
  # - secret -> client_secret (we treat it as client_assertion JWT when AUTH=DID)
  def by_uid_and_secret(uid, secret)
    # If this doesn't look like an RFC7523 request, fall back to the classic Doorkeeper behavior.
    return super unless rfc7523_request?(secret)

    client_id = uid.to_s.strip
    jwt       = secret.to_s

    return nil if client_id.empty? || jwt.empty?

    app = find_or_create_by!(uid: client_id) do |a|
      a.name = client_id
      a.redirect_uri = ""               # client_credentials needs no redirect_uri
      a.secret = SecureRandom.hex(32)   # not used for RFC7523, but keeps record consistent
    end

    ensure_jwks!(app)
    verify_client_assertion!(app, client_id: client_id, jwt: jwt)

    app
  rescue DidOydResolver::ResolutionFailed => e
    Rails.logger.info("DID auth: resolution failed did=#{e.did} reason=#{e.reason}")
    nil
  rescue DidOydResolver::ResolverError => e
    Rails.logger.error("DID auth: resolver error did=#{e.did} err=#{e.cause_class} msg=#{e.message}")
    nil
  rescue JWT::DecodeError, JWT::VerificationError => e
    Rails.logger.info("DID auth: jwt invalid client_id=#{uid} err=#{e.class.name}")
    nil
  rescue StandardError => e
    Rails.logger.error("DID auth: unexpected error client_id=#{uid} err=#{e.class.name}: #{e.message}")
    nil
  end

  private

  # We only take the RFC7523 path when:
  # - The extractor set OauthRequestContext.token_url (meaning client_assertion_type matched)
  # - The provided "secret" looks like a compact JWT/JWS (three base64url parts)
  def rfc7523_request?(secret)
    token_url = token_url_for_aud_check
    return false if token_url.empty?
    jwt_compact?(secret)
  end

  def jwt_compact?(s)
    parts = s.to_s.split(".")
    parts.length == 3 && parts.all? { |p| !p.empty? }
  end

  # Refresh stored JWKS (from DID Document) on first use or periodically.
  def ensure_jwks!(app)
    needs_refresh =
      app.jwks.blank? ||
      app.jwks_updated_at.blank? ||
      app.jwks_updated_at < JWKS_REFRESH_INTERVAL.ago

    return unless needs_refresh

    # Your DidOydResolver may only support did:oyd; it should raise ResolutionFailed otherwise.
    doc = DidOydResolver.resolve(app.uid)
    app.jwks = DidJwksExtractor.from_did_document(doc)
    app.jwks_updated_at = Time.current
    app.save!
  end

  # Verify the client_assertion JWT (signature + required claims).
  #
  # We follow a common RFC7523 profile:
  # - header.alg == "EdDSA"
  # - header.kid selects a key in JWKS
  # - payload.iss == payload.sub == client_id
  # - payload.aud matches token endpoint URL
  # - exp/iat reasonable (ttl <= ASSERTION_MAX_TTL_SEC)
  # - jti replay-protected
  def verify_client_assertion!(app, client_id:, jwt:)
    token_url = token_url_for_aud_check
    raise JWT::DecodeError, "missing token_url" if token_url.empty?

    header = JWT.decode(jwt, nil, false).last
    raise JWT::DecodeError, "alg must be EdDSA" unless header["alg"] == "EdDSA"

    kid = header["kid"].to_s
    raise JWT::DecodeError, "missing kid" if kid.empty?

    keys = Array(app.jwks && app.jwks["keys"])
    raise JWT::DecodeError, "no jwks keys" if keys.empty?

    jwk_hash = keys.find { |k| k["kid"].to_s == kid } || keys.first
    verify_key = JWT::JWK.import(jwk_hash).verify_key

    payload, = JWT.decode(
      jwt,
      verify_key,
      true,
      algorithm: "EdDSA",
      verify_iat: true
    )

    raise JWT::DecodeError, "iss mismatch" unless payload["iss"].to_s == client_id
    raise JWT::DecodeError, "sub mismatch" unless payload["sub"].to_s == client_id

    aud = payload["aud"]
    aud_ok = (aud == token_url) || (aud.is_a?(Array) && aud.include?(token_url))
    raise JWT::DecodeError, "aud mismatch" unless aud_ok

    iat = payload["iat"].to_i
    exp = payload["exp"].to_i
    raise JWT::DecodeError, "invalid iat/exp" if iat <= 0 || exp <= 0 || exp <= iat
    raise JWT::DecodeError, "assertion ttl too long" if (exp - iat) > ASSERTION_MAX_TTL_SEC

    jti = payload["jti"].to_s
    raise JWT::DecodeError, "missing jti" if jti.empty?

    cache_key = "oauth:client_assertion:jti:#{client_id}:#{jti}"
    ok = Rails.cache.write(cache_key, true, expires_in: JTI_CACHE_TTL, unless_exist: true)
    raise JWT::DecodeError, "replay detected" unless ok

    true
  end

  def token_url_for_aud_check
    return "" unless defined?(OauthRequestContext)
    OauthRequestContext.token_url.to_s
  end
end

# Patch as class-methods on Doorkeeper::Application
Doorkeeper::Application.singleton_class.prepend(DoorkeeperApplicationDidPatch)