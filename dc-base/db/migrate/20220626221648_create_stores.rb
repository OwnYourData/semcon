class CreateStores < ActiveRecord::Migration[7.0]
  def change
    create_table :stores do |t|
      t.text :item
      t.text :meta
      t.string :key
      t.string :dri
      t.string :schema

      t.timestamps
    end
  end
end
