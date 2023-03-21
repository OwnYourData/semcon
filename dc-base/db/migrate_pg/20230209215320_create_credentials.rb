class CreateCredentials < ActiveRecord::Migration[5.2]
  def change
    create_table :credentials do |t|
      t.string :identifier
      t.jsonb :vc
      t.string :holder

      t.timestamps
    end
  end
end
