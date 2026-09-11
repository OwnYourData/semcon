# frozen_string_literal: true

require "test_helper"

class DidResolverTest < ActiveSupport::TestCase
    DID = "did:oyd:zQmZ8tmWd2cQjjLqUzrrx8SAv2JU2C5nGmioiviisYdAWRW"
    MULTIBASE = "z6MkkZL5DNyWL1qjkuwtYCMuJUYvGDjthr2xmuQL9PEq63tt"

    def w3c_document
        {
            "id" => DID,
            "verificationMethod" => [{
                "id" => "#{DID}#key-doc",
                "type" => "Ed25519VerificationKey2020",
                "controller" => DID,
                "publicKeyMultibase" => MULTIBASE
            }],
            "authentication" => ["#{DID}#key-doc"]
        }
    end

    # Counts calls so that a test can prove the cache was used, and lets a test
    # assert that resolution never happens at all.
    def with_oydid_read(result)
        calls = []
        original = Oydid.method(:read)
        Oydid.define_singleton_method(:read) do |did, options|
            calls << did
            result
        end
        yield calls
    ensure
        Oydid.define_singleton_method(:read, original)
    end

    test "refuses anything that is not a DID without touching the network" do
        with_oydid_read([nil, "should not be called"]) do |calls|
            assert_nil DidResolver.resolve("")
            assert_nil DidResolver.resolve(nil)
            assert_nil DidResolver.resolve("https://example.com/did.json")
            assert_empty calls
        end
    end

    test "a primed document is served without resolving" do
        DidResolver.prime(DID, w3c_document)
        with_oydid_read([nil, "should not be called"]) do |calls|
            document = DidResolver.resolve(DID)
            assert_equal MULTIBASE, document.public_key_multibase
            assert_empty calls
        end
    end

    test "a resolved document is cached" do
        oydid_answer = [{ "did" => DID, "doc" => { "key" => "#{MULTIBASE}:zRevocation" } }, ""]
        with_oydid_read(oydid_answer) do |calls|
            assert_equal MULTIBASE, DidResolver.resolve(DID).public_key_multibase
            assert_equal MULTIBASE, DidResolver.resolve(DID).public_key_multibase
            assert_equal 1, calls.length, "second resolve went to the VDR again"
        end
    end

    test "a failed resolution is cached too, so a dead VDR is asked once" do
        with_oydid_read([nil, "cannot get did"]) do |calls|
            assert_nil DidResolver.resolve(DID)
            assert_nil DidResolver.resolve(DID)
            assert_equal 1, calls.length
        end
    end

    test "prime_missing makes a DID unresolvable for the vectors that need it" do
        DidResolver.prime_missing(DID)
        with_oydid_read([{ "doc" => { "key" => "#{MULTIBASE}:z" } }, ""]) do |calls|
            assert_nil DidResolver.resolve(DID)
            assert_empty calls
        end
    end

    test "forget drops a cached answer" do
        DidResolver.prime(DID, w3c_document)
        DidResolver.forget(DID)
        with_oydid_read([nil, "gone"]) do |calls|
            assert_nil DidResolver.resolve(DID)
            assert_equal 1, calls.length
        end
    end

    test "an exception during resolution is a refusal, not a 500" do
        original = Oydid.method(:read)
        Oydid.define_singleton_method(:read) { |_did, _options| raise "VDR on fire" }
        assert_nil DidResolver.resolve(DID)
    ensure
        Oydid.define_singleton_method(:read, original)
    end
end
