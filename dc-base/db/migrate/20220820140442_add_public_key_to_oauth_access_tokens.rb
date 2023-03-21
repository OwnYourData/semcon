class AddPublicKeyToOauthAccessTokens < ActiveRecord::Migration[7.0]
  def change
    add_column :oauth_access_tokens, :public_key, :string
  end
end
