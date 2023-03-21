class AddIdentifierIndexToCredentials < ActiveRecord::Migration[5.2]
  def change
    add_index :credentials, :identifier, unique: true
  end
end
