require "jwt"
require "base58"

class DidJwksExtractor
  MULTICODEC_ED25519_PUB = [0xED, 0x01].pack("C*")

  def self.from_did_document(doc)
    vms = Array(doc["verificationMethod"])
    keys = vms.filter_map do |vm|
      vm = vm.transform_keys(&:to_s)
      next unless vm["type"] == "Ed25519VerificationKey2020"
      pkmb = vm["publicKeyMultibase"].to_s
      next if pkmb.empty?
      kid = vm["id"].to_s
      raise Error, "verificationMethod is missing id" if kid.empty?
      pub_bytes = decode_public_key_bytes!(pkmb, kid: kid)

      {
        "kty" => "OKP",
        "crv" => "Ed25519",
        "x"   => b64url(pub_bytes),
        "kid" => kid,
        "use" => "sig",
        "alg" => "EdDSA"
      }
    end
    raise "no usable keys in DID doc" if keys.empty?
    { "keys" => keys }
  end

  # Base64URL without Padding (RFC 7515/7517)
  def self.b64url(bin)
    Base64.urlsafe_encode64(bin, padding: false)
  end
  private_class_method :b64url

  def self.decode_public_key_bytes!(public_key_multibase, kid:)
    verify_key, err = Oydid.decode_public_key(public_key_multibase)

    if verify_key.nil?
      msg = err.to_s.strip
      msg = "unknown error" if msg.empty?
      raise Error, "cannot decode publicKeyMultibase for #{kid}: #{msg}"
    end

    # Ed25519::VerifyKey (rbnacl / ed25519 gems) usually exposes raw bytes via #to_bytes
    pub = if verify_key.respond_to?(:to_bytes)
      verify_key.to_bytes
    elsif verify_key.respond_to?(:bytes)
      verify_key.bytes.pack("C*")
    elsif verify_key.respond_to?(:to_s)
      # Last resort: some libs might return a binary string via to_s
      verify_key.to_s
    else
      raise Error, "verify_key type unsupported for #{kid}: #{verify_key.class}"
    end

    raise Error, "expected 32-byte ed25519 pubkey for #{kid}, got #{pub.bytesize}" unless pub.bytesize == 32
    pub
  end

  private_class_method :decode_public_key_bytes!
end