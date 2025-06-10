class AddGinIndexesToStore < ActiveRecord::Migration[6.0]
  def change
    add_index :stores, :item, using: :gin, name: 'index_stores_on_data_gin'
    add_index :stores, :meta, using: :gin, name: 'index_stores_on_meta_gin'
  end
end