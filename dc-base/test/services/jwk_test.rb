# frozen_string_literal: true

require "test_helper"

class JwkTest < ActiveSupport::TestCase
    # Public test material from the delegation conformance vectors
    # (dpp-service/spec/fixtures/delegation-vectors/01-valid.json). Two
    # implementations in two languages have to agree on this value, otherwise
    # every DPoP-bound token is bound to a different thumbprint than the client
    # believes.
    VECTOR_JWK = { "kty" => "OKP", "crv" => "Ed25519",
                   "x" => "pxzDWAEpKXpUx0AJKQBgAbDmjvOBFn4gCLCUgH-C9gs" }.freeze
    VECTOR_JKT = "-zZb4AMOEaUBGzLLxhQew8IBSlrgIos7ADEj82Fpjjk"

    test "thumbprint matches the conformance vector" do
        assert_equal VECTOR_JKT, Jwk.thumbprint(VECTOR_JWK)
    end

    test "thumbprint ignores member order and extra members" do
        reordered = { "x" => VECTOR_JWK["x"], "crv" => "Ed25519", "kty" => "OKP",
                      "use" => "sig", "kid" => "irrelevant" }
        assert_equal VECTOR_JKT, Jwk.thumbprint(reordered)
    end

    test "thumbprint refuses anything that is not an Ed25519 OKP key" do
        assert_nil Jwk.thumbprint("kty" => "EC", "crv" => "P-256", "x" => VECTOR_JWK["x"])
        assert_nil Jwk.thumbprint("kty" => "OKP", "crv" => "X25519", "x" => VECTOR_JWK["x"])
        assert_nil Jwk.thumbprint("kty" => "OKP", "crv" => "Ed25519", "x" => "dG9vIHNob3J0")
        assert_nil Jwk.thumbprint(nil)
    end

    test "round trip raw key to jwk and back" do
        raw = signing_key_for("jwk-round-trip").verify_key.to_bytes
        jwk = Jwk.from_raw_ed25519(raw)
        assert_equal "OKP", jwk["kty"]
        assert_equal raw, Jwk.raw_ed25519(jwk)
        assert_instance_of RbNaCl::Signatures::Ed25519::VerifyKey, Jwk.verify_key(jwk)
    end

    test "from_raw refuses a key of the wrong length" do
        assert_nil Jwk.from_raw_ed25519("short")
        assert_nil Jwk.from_raw_ed25519(nil)
    end

    test "base64url decoding is strict" do
        assert_equal "hello", Jwk.b64u_decode(Jwk.b64u_encode("hello"))
        assert_nil Jwk.b64u_decode("aGVsbG8=")   # padded
        assert_nil Jwk.b64u_decode("a+/o")       # standard alphabet
        assert_nil Jwk.b64u_decode("aGVs bG8")   # whitespace
        assert_nil Jwk.b64u_decode("")
    end
end
