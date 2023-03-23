class ApplicationController < ActionController::API
    after_action :cors_set_access_control_headers

    def version
        render json: {"service": "data container", "version": VERSION.to_s, "oydid-gem": Gem.loaded_specs["oydid"].version.to_s}.to_json,
               status: 200
    end

    def cors_set_access_control_headers
        headers['Access-Control-Expose-Headers'] = '*'
    end

    def missing
        render json: {"error": "invalid path"},
               status: 404
    end	
end