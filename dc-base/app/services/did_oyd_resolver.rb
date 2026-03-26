# frozen_string_literal: true

class DidOydResolver
  class Error < StandardError; end
  class ResolutionFailed < Error
    attr_reader :did, :reason
    def initialize(did, reason: nil)
      @did = did
      @reason = reason
      super("DID resolution failed for #{did}#{reason ? " (#{reason})" : ""}")
    end
  end
  class ResolverError < Error
    attr_reader :did, :cause_class
    def initialize(did, cause)
      @did = did
      @cause_class = cause.class.name
      super("DID resolver error for #{did} (#{@cause_class}: #{cause.message})")
    end
  end
  def self.resolve(did)
    did = did.to_s.strip
    raise ResolutionFailed.new(did, reason: "blank did") if did.empty?
    raise ResolutionFailed.new(did, reason: "not did:oyd") unless did.start_with?("did:oyd:")

    result, err_msg = Oydid.read(did, {})

    if result.nil?
      raise ResolutionFailed.new(did, reason: err_msg.to_s.strip)
    end

    w3c_did = Oydid.w3c(result, {})
    validate_did_document!(did, w3c_did)

    w3c_did
  rescue ResolutionFailed
    raise
  rescue StandardError => e
    raise ResolverError.new(did, e)
  end

  def self.validate_did_document!(requested_did, doc)
    unless doc.is_a?(Hash)
      raise ResolutionFailed.new(requested_did, reason: "w3c did is not a hash")
    end
    id = doc["id"].to_s
    if id.empty?
      raise ResolutionFailed.new(requested_did, reason: "missing id in did document")
    end
    # an updated DID can have id != requested_did
    # if id != requested_did
    #   raise ResolutionFailed.new(requested_did, reason: "did document id mismatch: #{id}")
    # end
    vms = Array(doc["verificationMethod"])
    if vms.empty?
      raise ResolutionFailed.new(requested_did, reason: "no verificationMethod in did document")
    end
    true
  end

  private_class_method :validate_did_document!
end
