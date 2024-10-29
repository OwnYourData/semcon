class ChangeDefaultForTempInDoorkeeperApplication < ActiveRecord::Migration[7.1]
  def change
    change_column_default :oauth_applications, :temp, from: nil, to: false
  end
end
