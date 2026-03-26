# frozen_string_literal: true
return unless defined?(AuthMode) && AuthMode.did?

module Doorkeeper
  module OAuth
    class Client
      Credentials.singleton_class.class_eval do
        ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

        def from_private_key_jwt(request)
          p = request.parameters

          client_id  = p["client_id"]  || p[:client_id]
          assertion  = p["client_assertion"] || p[:client_assertion]
          type       = p["client_assertion_type"] || p[:client_assertion_type]

          return unless client_id && !client_id.to_s.empty?
          return unless assertion && !assertion.to_s.empty?
          return unless type.to_s == ASSERTION_TYPE

          # IMPORTANT: ActiveSupport::CurrentAttributes -> kein .current
          OauthRequestContext.token_url = request.url
          OauthRequestContext.auth_method = OauthAuthMethods::PRIVATE_KEY_JWT

          [client_id.to_s, assertion.to_s]
        end
      end
    end
  end
end