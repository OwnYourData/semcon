module Api
    module V1
        class ResourcesController < ApiController
            def active
                retVal = { "active": true,
                           "auth": !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false") ,
                           "repos": false
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