# frozen_string_literal: true

# Verification of compact JWS with alg EdDSA (Ed25519).
#
# Why this is not the +jwt+ gem: everything this application verifies is an
# assertion with its own claim rules (validity windows differ per statement
# type, +aud+ is checked against different values, +typ+ is mandatory). The gem
# would have to be told to switch all of that off, and what would be left is
# exactly what stands below. Doing it here keeps the algorithm whitelist and
# the mandatory +typ+ check in one readable place.
#
# Four properties this file exists to guarantee:
#
#   * the algorithm is never taken from the token. +alg+ is compared against a
#     fixed value; the key is chosen by the caller (RFC 8725 section 3.1).
#   * +typ+ is a required argument, not an option. Without it a delegation can
#     be presented as a client assertion or as a write token
#     (RFC 8725 section 3.11).
#   * a +crit+ header is refused outright. RFC 7515 section 4.1.11 obliges a
#     recipient to reject a JWS whose +crit+ names extensions it does not
#     understand. This verifier understands none, so every +crit+ is a
#     refusal - an empty array included, because a sender that announces
#     extensions and names none is not a sender we can read.
#   * the header is an allowlist. +allow+ names the header parameters the
#     caller expects; every other key is a refusal, whatever its value. A
#     denylist of the parameters known today would have to be maintained as
#     JOSE grows, and whoever forgets to maintain it does not find out. Like
#     +typ+ this is a required argument: a default is forgotten, an argument
#     is not.
#
# Every failure returns a reason symbol instead of raising. Callers log the
# reason and answer with a generic error - a precise error message is a manual
# for forging the next attempt.
class Jws
    ALG = "EdDSA"

    Result = Struct.new(:ok, :header, :claims, :reason, keyword_init: true) do
        def ok?
            ok
        end
    end

    class << self
        # Header only, without any verification. For picking the key when it is
        # carried in the header (DPoP) or named by +kid+. Never trust anything
        # from here beyond that choice.
        def peek(compact)
            parts = split(compact)
            return failure(:malformed) if parts.nil?

            header = parse_json(parts[0])
            return failure(:malformed_header) if header.nil?

            Result.new(ok: true, header: header)
        end

        # verify_key: RbNaCl::Signatures::Ed25519::VerifyKey
        # typ:        expected value of the +typ+ header, mandatory
        # allow:      header parameters this statement may carry, mandatory.
        #             Anything else refuses. Array() so that a nil allows
        #             nothing rather than raising - fail closed.
        def verify(compact, typ:, allow:, verify_key:)
            return failure(:no_key) if verify_key.nil?

            parts = split(compact)
            return failure(:malformed) if parts.nil?

            header = parse_json(parts[0])
            return failure(:malformed_header) if header.nil?
            return failure(:wrong_alg) unless header["alg"] == ALG
            return failure(:wrong_typ) unless header["typ"] == typ.to_s
            return failure(:crit_not_supported) if header.key?("crit")
            return failure(:header_not_allowed) unless
                (header.keys - Array(allow).map(&:to_s)).empty?

            signature = Jwk.b64u_decode(parts[2])
            return failure(:malformed) if signature.nil? || signature.bytesize != 64

            signing_input = "#{parts[0]}.#{parts[1]}"
            begin
                verify_key.verify(signature, signing_input)
            rescue RbNaCl::BadSignatureError, RbNaCl::LengthError
                return failure(:bad_signature, header: header)
            end

            claims = parse_json(parts[1])
            return failure(:malformed_claims, header: header) if claims.nil?

            Result.new(ok: true, header: header, claims: claims)
        end

        private

        def split(compact)
            return nil unless compact.is_a?(String)

            parts = compact.split(".", -1)
            return nil unless parts.length == 3 && parts.none?(&:empty?)

            parts
        end

        def parse_json(segment)
            raw = Jwk.b64u_decode(segment)
            return nil if raw.nil?

            parsed = JSON.parse(raw)
            parsed.is_a?(Hash) ? parsed : nil
        rescue JSON::ParserError
            nil
        end

        def failure(reason, header: nil)
            Result.new(ok: false, reason: reason, header: header)
        end
    end
end
