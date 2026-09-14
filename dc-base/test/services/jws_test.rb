# frozen_string_literal: true

require "test_helper"

class JwsTest < ActiveSupport::TestCase
    # The two calling sets there are, per CC-ADR 0013 addendum of 2026-09-10:
    # delegation and client assertion pick the key from the DID via kid, the
    # DPoP proof carries its key in the header.
    ALLOW_KID = %w[alg typ kid].freeze
    ALLOW_JWK = %w[alg typ jwk].freeze

    setup do
        @key = signing_key_for("jws-test")
        @verify_key = @key.verify_key
        @claims = { "iss" => "did:oyd:zQmTest", "jti" => "abc" }
    end

    def token(header: {}, claims: nil, key: @key)
        sign_jws({ "alg" => "EdDSA", "typ" => "test+jwt" }.merge(header),
                 claims || @claims, key)
    end

    test "verifies a well formed token" do
        result = Jws.verify(token, typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert result.ok?
        assert_equal "did:oyd:zQmTest", result.claims["iss"]
        assert_equal "test+jwt", result.header["typ"]
    end

    test "refuses a foreign typ" do
        result = Jws.verify(token(header: { "typ" => "dpp-delegation+jwt" }),
                            typ: "client-assertion+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :wrong_typ, result.reason
    end

    test "refuses a missing typ" do
        header = { "alg" => "EdDSA" }
        compact = sign_jws(header, @claims, @key)
        result = Jws.verify(compact, typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :wrong_typ, result.reason
    end

    # The one that matters: alg is never taken from the token.
    test "refuses alg none and any algorithm other than EdDSA" do
        %w[none HS256 RS256 ES256 EdDSA2].each do |alg|
            result = Jws.verify(token(header: { "alg" => alg }),
                                typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
            assert_not result.ok?, "#{alg} was accepted"
            assert_equal :wrong_alg, result.reason
        end
    end

    # RFC 7515 4.1.11: crit names extensions the recipient has to understand.
    # This verifier understands none, so every crit is a refusal.
    test "refuses a crit header naming extensions" do
        result = Jws.verify(token(header: { "crit" => ["b64"] }),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :crit_not_supported, result.reason
    end

    test "refuses an empty crit header" do
        result = Jws.verify(token(header: { "crit" => [] }),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :crit_not_supported, result.reason
    end

    # The allowlist covers crit as well. crit keeps its own reason anyway,
    # because RFC 7515 demands the refusal by name and the log should say so.
    # This pins the order: crit is checked before the allowlist.
    test "crit keeps its own reason even when the allowlist would permit it" do
        result = Jws.verify(token(header: { "crit" => ["b64"] }),
                            typ: "test+jwt", allow: %w[alg typ crit], verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :crit_not_supported, result.reason
    end

    test "accepts an otherwise identical token without crit" do
        result = Jws.verify(token, typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert result.ok?
        assert_not result.header.key?("crit")
    end

    test "accepts a header carrying only allowed parameters" do
        result = Jws.verify(token(header: { "kid" => "did:oyd:zQmTest#key-1" }),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert result.ok?
        assert_equal "did:oyd:zQmTest#key-1", result.header["kid"]
    end

    # The gain the addendum is actually after: a key smuggled into the header
    # of a statement whose key comes from the DID is refused, not ignored.
    test "refuses a jwk where only alg typ kid are allowed" do
        jwk = { "kty" => "OKP", "crv" => "Ed25519", "x" => "irrelevant" }
        result = Jws.verify(token(header: { "jwk" => jwk }),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :header_not_allowed, result.reason
    end

    test "refuses a kid in the dpop proof set" do
        result = Jws.verify(token(header: { "kid" => "did:oyd:zQmTest#key-1" }),
                            typ: "test+jwt", allow: ALLOW_JWK, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :header_not_allowed, result.reason
    end

    # An allowlist, not a denylist: these fall without the verifier ever
    # having heard of them. The guard below keeps it that way.
    test "refuses JOSE parameters the verifier does not know" do
        %w[x5c x5u x5t jku kid2 b64].each do |param|
            result = Jws.verify(token(header: { param => "anything" }),
                                typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
            assert_not result.ok?, "#{param} was accepted"
            assert_equal :header_not_allowed, result.reason
        end
    end

    test "the verifier names no denied header parameter" do
        source = Rails.root.join("app", "services", "jws.rb").read
        %w[x5c x5u x5t jku].each do |param|
            assert_not source.include?(param),
                       "jws.rb names #{param} - that is a denylist, and a denylist rots"
        end
    end

    test "refuses everything when allow is empty" do
        result = Jws.verify(token, typ: "test+jwt", allow: [], verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :header_not_allowed, result.reason
    end

    test "refuses a signature made with a different key" do
        result = Jws.verify(token(key: signing_key_for("someone-else")),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :bad_signature, result.reason
    end

    test "refuses a tampered payload" do
        header, payload, signature = token.split(".")
        tampered = Jwk.b64u_encode(JSON.generate(@claims.merge("iss" => "did:oyd:zQmEvil")))
        result = Jws.verify([header, tampered, signature].join("."),
                            typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key)
        assert_not result.ok?
        assert_equal :bad_signature, result.reason
    end

    test "refuses malformed input" do
        assert_equal :malformed_header,
                     Jws.verify("not.a.token", typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key).reason
        assert_equal :malformed,
                     Jws.verify("only.two", typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key).reason
        assert_equal :malformed,
                     Jws.verify("a..c", typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key).reason
        assert_equal :malformed,
                     Jws.verify(nil, typ: "test+jwt", allow: ALLOW_KID, verify_key: @verify_key).reason
    end

    test "refuses a token when no key could be found" do
        result = Jws.verify(token, typ: "test+jwt", allow: ALLOW_KID, verify_key: nil)
        assert_not result.ok?
        assert_equal :no_key, result.reason
    end

    test "peek reads the header without verifying" do
        result = Jws.peek(token(key: signing_key_for("someone-else")))
        assert result.ok?
        assert_equal "EdDSA", result.header["alg"]
        assert_nil result.claims
    end
end
