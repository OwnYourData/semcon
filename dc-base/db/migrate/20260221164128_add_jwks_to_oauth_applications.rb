class AddJwksToOauthApplications < ActiveRecord::Migration[7.2]
  def change
    add_column :oauth_applications, :jwks, :json
    add_column :oauth_applications, :jwks_updated_at, :datetime
  end
end
