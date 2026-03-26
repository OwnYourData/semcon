module AuthMode
  def self.did?
    ENV.fetch("AUTH", "").to_s.strip.casecmp("DID").zero?
  end
end