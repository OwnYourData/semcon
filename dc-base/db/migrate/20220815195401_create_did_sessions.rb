class CreateDidSessions < ActiveRecord::Migration[7.0]
  def change
    create_table :did_sessions do |t|
      t.string :session
      t.integer :oauth_application_id
      t.string :challenge

      t.timestamps
    end
  end
end
