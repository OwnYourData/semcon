# frozen_string_literal: true

require "test_helper"

class DidDocumentTest < ActiveSupport::TestCase
    # Public test material from the delegation conformance vectors.
    DID = "did:oyd:zQmZ8tmWd2cQjjLqUzrrx8SAv2JU2C5nGmioiviisYdAWRW"
    MULTIBASE = "z6MkkZL5DNyWL1qjkuwtYCMuJUYvGDjthr2xmuQL9PEq63tt"
    RAW_B64U = "WrQpLpMMMuurzWef6lpbJMtvJD8V8ZausVp69PD-O3E"

    def document(overrides = {})
        DidDocument.new({
            "id" => DID,
            "verificationMethod" => [{
                "id" => "#{DID}#key-doc",
                "type" => "Ed25519VerificationKey2020",
                "controller" => DID,
                "publicKeyMultibase" => MULTIBASE
            }],
            "authentication" => ["#{DID}#key-doc"]
        }.merge(overrides))
    end

    test "decodes publicKeyMultibase into raw Ed25519 bytes" do
        assert_equal RAW_B64U, Jwk.b64u_encode(document.public_key_raw)
        assert_equal 32, document.public_key_raw.bytesize
        assert_instance_of RbNaCl::Signatures::Ed25519::VerifyKey, document.verify_key
    end

    test "selects the verification method by kid" do
        assert_equal MULTIBASE, document.public_key_multibase("#{DID}#key-doc")
        assert_equal MULTIBASE, document.public_key_multibase("#key-doc")
    end

    test "an unknown kid resolves to no key at all" do
        assert_nil document.public_key_multibase("#{DID}#some-other-key")
        assert_nil document.verify_key("#{DID}#some-other-key")
    end

    test "refuses a key that is not ed25519-pub" do
        # x25519-pub multicodec (0xec) instead of ed25519-pub (0xed)
        doc = document("verificationMethod" => [{
            "id" => "#{DID}#key-doc",
            "publicKeyMultibase" => "z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc"
        }])
        assert_nil doc.public_key_raw
    end

    test "refuses a document without a usable key" do
        assert_nil DidDocument.new({}).public_key_raw
        assert_nil DidDocument.new("verificationMethod" => []).public_key_raw
        assert_nil document("verificationMethod" => [{ "id" => "#{DID}#key-doc" }]).public_key_raw
        assert_nil DidDocument.decode_multibase_ed25519("not-multibase")
        assert_nil DidDocument.decode_multibase_ed25519(nil)
    end

    test "builds the W3C view from an oydid document, document key only" do
        doc = DidDocument.from_oydid(DID, "doc" => { "key" => "#{MULTIBASE}:zRevocationKeyGoesHere" })
        assert_equal DID, doc.id
        assert_equal MULTIBASE, doc.public_key_multibase
        assert_equal 1, Array(doc.document["verificationMethod"]).length
    end

    test "an oydid document without a key yields nothing" do
        assert_nil DidDocument.from_oydid(DID, {})
        assert_nil DidDocument.from_oydid(DID, "doc" => {})
        assert_nil DidDocument.from_oydid(DID, nil)
    end
end
