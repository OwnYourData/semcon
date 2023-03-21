class AddDidToStores < ActiveRecord::Migration[7.0]
  def change
    add_column :stores, :did, :string
  end
end
