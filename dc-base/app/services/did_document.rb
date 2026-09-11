# frozen_string_literal: true

# A resolved DID document in W3C form, reduced to the one question this
# application asks it: which Ed25519 key signs on behalf of this DID?
#
# Only +publicKeyMultibase+ on a verification method is honoured, and only the
# ed25519-pub multicodec. Delegated keys are deliberately not followed: the
# delegation model says "take the document key", and every additional key that
# may sign is an additional way to lose control of a DID without noticing.
class DidDocument
    # Multibase base58btc ("z" prefix) plus the ed25519-pub multicodec, whose
    # varint encoding is the two bytes ED 01.
    #
    # Decoded here rather than through Oydid.multi_decode on purpose: that
    # method only exists from oydid 0.5, and a derived image can resolve an
    # older one (dc-pod ran 0.4.4). The failure mode was the bad kind - the
    # NoMethodError was swallowed by the rescue below and every key silently
    # became nil, which reads exactly like a wrong signature. Sixteen lines of
    # base58 are cheaper than that. The reference implementation on the DPP
    # Service side checks the same two bytes.
    BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    MULTIBASE_BASE58BTC = "z"
    MULTICODEC_ED25519_PUB = "\xED\x01".b

    attr_reader :document

    def initialize(document)
        @document = (document || {}).transform_keys(&:to_s)
    end

    def id
        document["id"].to_s
    end

    # kid: full verification method id ("did:oyd:z...#key-doc") or a bare
    # fragment ("#key-doc"). Unknown kid returns nil - fail closed rather than
    # silently falling back to some other key in the document.
    def verification_method(kid = nil)
        methods = Array(document["verificationMethod"]).map { |m| m.transform_keys(&:to_s) }
        return nil if methods.empty?
        return methods.first if kid.nil? || kid.to_s.empty?

        wanted = kid.to_s
        methods.find do |m|
            mid = m["id"].to_s
            mid == wanted || (wanted.start_with?("#") && mid.end_with?(wanted))
        end
    end

    def public_key_multibase(kid = nil)
        verification_method(kid)&.fetch("publicKeyMultibase", nil)
    end

    # Raw 32 bytes, or nil.
    def public_key_raw(kid = nil)
        self.class.decode_multibase_ed25519(public_key_multibase(kid))
    end

    def verify_key(kid = nil)
        raw = public_key_raw(kid)
        return nil if raw.nil?

        RbNaCl::Signatures::Ed25519::VerifyKey.new(raw)
    rescue RbNaCl::LengthError
        nil
    end

    class << self
        # "z" + base58btc(ED 01 || 32 key bytes) -> the 32 key bytes, or nil.
        def decode_multibase_ed25519(encoded)
            value = encoded.to_s
            return nil unless value.start_with?(MULTIBASE_BASE58BTC)

            decoded = base58btc_decode(value[1..])
            return nil if decoded.nil?
            return nil unless decoded.byteslice(0, 2) == MULTICODEC_ED25519_PUB

            key = decoded.byteslice(2..-1).to_s
            key.bytesize == Jwk::KEY_BYTES ? key : nil
        rescue StandardError
            nil
        end

        def base58btc_decode(value)
            number = 0
            value.each_char do |char|
                index = BASE58_ALPHABET.index(char)
                return nil if index.nil?

                number = (number * 58) + index
            end

            hex = number.to_s(16)
            hex = "0#{hex}" if hex.length.odd?
            leading_zeroes = value[/\A1*/].to_s.length

            ("\x00".b * leading_zeroes) + [hex].pack("H*")
        end

        # Builds the W3C view of an oydid DID document from what Oydid.read
        # returns. Only the document key is carried over - see the note above.
        def from_oydid(did, did_info)
            info = (did_info || {}).transform_keys(&:to_s)
            key = info.dig("doc", "key").to_s.split(":").first.to_s
            return nil if key.empty?

            method_id = "#{did}#key-doc"
            new(
                "@context" => "https://www.w3.org/ns/did/v1",
                "id" => did,
                "verificationMethod" => [{
                    "id" => method_id,
                    "type" => "Ed25519VerificationKey2020",
                    "controller" => did,
                    "publicKeyMultibase" => key
                }],
                "authentication" => [method_id]
            )
        end
    end
end
