class AddJwksToOauthApplications < ActiveRecord::Migration[7.2]
  def change
    add_column :oauth_applications, :jwks, :jsonb
    add_column :oauth_applications, :jwks_updated_at, :datetime
    add_index  :oauth_applications, :jwks, using: :gin
  end
end
