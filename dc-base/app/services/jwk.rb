# frozen_string_literal: true

require "base64"
require "json"

# JWK helpers for Ed25519 (OKP) keys.
#
# Deliberately narrow: this application only ever sees EdDSA/Ed25519 keys.
# Anything else is refused rather than translated, because a JWK helper that
# accepts more key types than the verifier can check is an invitation to
# algorithm confusion (RFC 8725 section 3.1).
class Jwk
    CRV = "Ed25519"
    KTY = "OKP"
    KEY_BYTES = 32

    class << self
        # Base64url without padding, as JOSE requires (RFC 7515 appendix C).
        def b64u_encode(bytes)
            Base64.urlsafe_encode64(bytes.to_s, padding: false)
        end

        # Strict: rejects padding characters, whitespace and standard-alphabet
        # base64. Returns nil instead of raising, so callers stay fail-closed
        # without exception handling in the hot path.
        def b64u_decode(str)
            s = str.to_s
            return nil unless s.match?(/\A[A-Za-z0-9_-]+\z/)

            Base64.urlsafe_decode64(s + ("=" * ((4 - (s.length % 4)) % 4)))
        rescue ArgumentError
            nil
        end

        def from_raw_ed25519(raw)
            return nil unless raw.is_a?(String) && raw.bytesize == KEY_BYTES

            { "kty" => KTY, "crv" => CRV, "x" => b64u_encode(raw) }
        end

        # Raw 32 public key bytes out of a JWK, or nil.
        def raw_ed25519(jwk)
            return nil unless jwk.is_a?(Hash)

            j = jwk.transform_keys(&:to_s)
            return nil unless j["kty"] == KTY && j["crv"] == CRV

            raw = b64u_decode(j["x"])
            return nil unless raw && raw.bytesize == KEY_BYTES

            raw
        end

        def verify_key(jwk)
            raw = raw_ed25519(jwk)
            return nil if raw.nil?

            RbNaCl::Signatures::Ed25519::VerifyKey.new(raw)
        rescue RbNaCl::LengthError
            nil
        end

        # JWK thumbprint, RFC 7638. For OKP the required members are
        # crv, kty, x - in lexicographic order, no whitespace, SHA-256,
        # base64url without padding. This value is the +jkt+ that an access
        # token is bound to (RFC 9449 section 6).
        def thumbprint(jwk)
            return nil unless jwk.is_a?(Hash)

            j = jwk.transform_keys(&:to_s)
            return nil unless raw_ed25519(j)

            canonical = JSON.generate("crv" => j["crv"], "kty" => j["kty"], "x" => j["x"])
            b64u_encode(RbNaCl::Hash.sha256(canonical))
        end
    end
end
