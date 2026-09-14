# frozen_string_literal: true

require "timeout"

# Resolution of foreign DIDs, with the caching discipline the storage layer
# depends on.
#
# Three properties that are not decoration:
#
#   * **Cached.** Positive answers 300 s, negative answers 60 s. Without this
#     the availability of the pod hangs on the availability of the VDR, and a
#     token endpoint that resolves on every request is a denial-of-service
#     amplifier pointed at someone else's server. The negative window is the
#     price of a revoked DID staying usable for up to 300 s - noted in
#     Delegation.md section 11.
#   * **Bounded in time.** HTTParty inside the oydid gem has no timeout; a
#     hanging VDR would hold a request thread for as long as it likes.
#   * **No local shortcut.** Resolution never falls back to this instance's own
#     +dids+ table. Anyone can POST a DID here, and a locally stored entry must
#     not be able to shadow a foreign identity.
class DidResolver
    POSITIVE_TTL = 300
    NEGATIVE_TTL = 60
    TIMEOUT = 5
    CACHE_PREFIX = "did_resolver/v1"

    class << self
        # Returns a DidDocument or nil.
        def resolve(did)
            return nil if did.to_s.empty? || !did.to_s.start_with?("did:")

            cached = Rails.cache.read(cache_key(did))
            unless cached.nil?
                return cached["ok"] ? DidDocument.new(cached["document"]) : nil
            end

            document = fetch(did)
            if document.nil?
                Rails.cache.write(cache_key(did), { "ok" => false }, expires_in: NEGATIVE_TTL)
                return nil
            end

            Rails.cache.write(cache_key(did),
                              { "ok" => true, "document" => document.document },
                              expires_in: POSITIVE_TTL)
            document
        end

        # Test seam. The conformance vectors carry their own resolver map and
        # must run without network I/O; priming the cache is how they get in.
        def prime(did, document, ttl: POSITIVE_TTL)
            Rails.cache.write(cache_key(did),
                              { "ok" => true, "document" => DidDocument.new(document).document },
                              expires_in: ttl)
        end

        def prime_missing(did, ttl: NEGATIVE_TTL)
            Rails.cache.write(cache_key(did), { "ok" => false }, expires_in: ttl)
        end

        def forget(did)
            Rails.cache.delete(cache_key(did))
        end

        def cache_key(did)
            "#{CACHE_PREFIX}/#{did}"
        end

        private

        def fetch(did)
            did_info, error = Timeout.timeout(TIMEOUT) { Oydid.read(did.to_s, {}) }
            if did_info.nil? || error.to_s != ""
                Rails.logger.info("[did_resolver] cannot resolve #{did}: #{error}")
                return nil
            end

            DidDocument.from_oydid(did.to_s, did_info)
        rescue Timeout::Error
            Rails.logger.warn("[did_resolver] timeout resolving #{did}")
            nil
        rescue StandardError => e
            Rails.logger.warn("[did_resolver] error resolving #{did}: #{e.class}")
            nil
        end
    end
end
