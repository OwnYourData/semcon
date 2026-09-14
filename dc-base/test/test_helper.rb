# frozen_string_literal: true

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
    # The DID resolver caches. Tests that prime it must not leak into each
    # other, and :null_store would make priming a silent no-op - see
    # config/environments/test.rb.
    setup do
        Rails.cache.clear if Rails.cache.respond_to?(:clear)
    end

    # Deterministic Ed25519 key from a label, so that a failing test names the
    # key it failed on instead of a random blob.
    def signing_key_for(label)
        RbNaCl::Signatures::Ed25519::SigningKey.new(RbNaCl::Hash.sha256(label.to_s))
    end

    def sign_jws(header, claims, signing_key)
        h = Jwk.b64u_encode(JSON.generate(header))
        p = Jwk.b64u_encode(JSON.generate(claims))
        s = Jwk.b64u_encode(signing_key.sign("#{h}.#{p}"))
        "#{h}.#{p}.#{s}"
    end
end
