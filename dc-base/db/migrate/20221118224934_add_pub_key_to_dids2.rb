class AddPubKeyToDids2 < ActiveRecord::Migration[5.2]
  def change
    add_index :dids, :public_key, unique: true
  end
end
