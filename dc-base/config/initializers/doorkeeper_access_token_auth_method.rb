# frozen_string_literal: true

Rails.application.config.to_prepare do
  Doorkeeper::AccessToken.class_eval do
    before_create do
      # OauthRequestContext ist dein CurrentAttributes
      m = defined?(OauthRequestContext) ? OauthRequestContext.auth_method.to_s : ""
      self.auth_method = m.presence || "client_secret"
    end
  end
end