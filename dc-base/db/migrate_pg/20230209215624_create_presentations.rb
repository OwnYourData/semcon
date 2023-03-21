class CreatePresentations < ActiveRecord::Migration[5.2]
  def change
    create_table :presentations do |t|
      t.string :identifier
      t.jsonb :vp
      t.string :holder

      t.timestamps
    end
  end
end
