# frozen_string_literal: true

# frozen_string_literal: true

class DidCapabilityDelegation
  # Returns true iff:
  # - record_did resolves to a W3C DID Document, and
  # - the DID Document contains a DID URL in "capabilityDelegation" whose DID matches request_did
  #
  # Example:
  #   request_did = "did:oyd:abc..."
  #   capabilityDelegation includes "did:oyd:abc...#key-1"  -> TRUE
  #
  # Fail-closed: any error -> false.
  def self.allowed?(request_did:, record_did:)
    request_did = request_did.to_s.strip
    record_did  = record_did.to_s.strip
    return false if request_did.empty? || record_did.empty?

    doc = DidOydResolver.resolve(record_did).transform_keys(&:to_s)
    delegations = Array(doc["capabilityDelegation"])
    return false if delegations.empty?

    delegations.any? do |entry|
      did_url =
        case entry
        when String then entry
        when Hash   then entry["id"]
        else nil
        end

      did = extract_did(did_url)
      did == request_did
    end
  rescue StandardError => e
    Rails.logger.warn(
      "capdel: error while checking delegation " \
      "request_did=#{request_did.inspect} record_did=#{record_did.inspect} " \
      "err=#{e.class}: #{e.message}"
    )
    Rails.logger.debug(e.backtrace&.first(10)&.join("\n")) # optional, keep short
    false
  end

  # Extracts the DID part from a DID URL:
  # - "did:example:123#key-1" -> "did:example:123"
  # - "did:example:123?x=y"   -> "did:example:123"
  def self.extract_did(did_url)
    s = did_url.to_s.strip
    return "" if s.empty?

    s = s.split("#", 2).first
    s = s.split("?", 2).first
    s.strip
  end

  private_class_method :extract_did
end