class AddPubkeyToDidSessions < ActiveRecord::Migration[5.2]
  def change
    add_column :did_sessions, :public_key, :string
  end
end
