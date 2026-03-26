class AddAuthMethodToOauthAccessTokens < ActiveRecord::Migration[7.2]
  def change
    add_column :oauth_access_tokens, :auth_method, :string
  end
end
