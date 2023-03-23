class ApiController < ApplicationController
	if !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false")
		before_action -> { doorkeeper_authorize! :read, :write, :admin }, except: :active
	end
end