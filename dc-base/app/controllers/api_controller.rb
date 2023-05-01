class ApiController < ApplicationController
    def doorkeeper_unauthorized_render_options(error: nil)
        { json: { error: "Not authorized" } }
    end

    if !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false")
        before_action -> { doorkeeper_authorize! :read, :write, :admin }, except: :active
    end
end