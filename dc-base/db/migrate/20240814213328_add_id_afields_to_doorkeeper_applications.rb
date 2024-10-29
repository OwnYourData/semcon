class AddIdAfieldsToDoorkeeperApplications < ActiveRecord::Migration[7.1]
  def change
    add_column :oauth_applications, :bpk, :string
    add_column :oauth_applications, :temp, :boolean
  end
end
