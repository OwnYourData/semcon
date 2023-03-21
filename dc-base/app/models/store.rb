# == Schema Information
#
# Table name: stores
#
#  id         :integer          not null, primary key
#  did        :string
#  dri        :string
#  item       :text
#  key        :string
#  meta       :text
#  schema     :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class Store < ApplicationRecord
end
