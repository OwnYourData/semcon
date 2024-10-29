class CreateIdaustriaUuids < ActiveRecord::Migration[7.1]
  def change
    create_table :idaustria_uuids do |t|
      t.string :uuid

      t.timestamps
    end
  end
end
