module Api
    module V1
        class ResourcesController < ApiController
            def active
                if ENV["AUTH_SCOPE"].nil?
                    retVal = { "active": true,
                               "auth": !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false") ,
                               "repos": false
                             }
                else
                    retVal = { "active": true,
                               "auth": !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false") ,
                               "repos": false,
                               "scopes": JSON.parse(ENV["AUTH_SCOPE"].to_s)
                             }

                end

                render json: retVal, 
                       status: 200
            end

            def info
                container_name = ENV["CONTAINER_NAME"] || "Container Name"
                container_description = ENV["CONTAINER_DESCRIPTION"] || "here is the description and purpose of the container"
                retVal = {
                    "name": container_name.to_s,
                    "description": container_description.to_s
                }
                render json: retVal, 
                       status: 200
            end

        end
    end

    # template for multiple versions -> copy into folder controllers/api/v2
    # module V2
    #     class ResourcesController < ApiController
    #         def active2
    #             render json: [2], 
    #                    status: 200
    #         end
    #     end
    # end
end