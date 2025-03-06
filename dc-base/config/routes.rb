Rails.application.routes.draw do
    mount Rswag::Ui::Engine => '/api-docs'
    mount Rswag::Api::Engine => '/api-docs'

    use_doorkeeper
    # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html
    namespace :api, defaults: { format: :json } do
        scope "(:version)", :version => /v1/, module: :v1 do
            draw(:extend_api_v1)
            match 'active',             to: 'resources#active',       via: 'get'
            match 'ida-signin',         to: 'resources#idaustria',    via: 'get'

            match 'data',               to: 'stores#read',            via: 'get'
            match 'data',               to: 'stores#write',           via: 'post'
            match 'data',               to: 'stores#update',          via: 'put'
            match 'data',               to: 'stores#delete',          via: 'delete'

            match 'meta/schemas',       to: 'stores#schemas',         via: 'get'
            match 'meta/info',          to: 'resources#info',         via: 'get'

        end
        # template for multiple versions
        # scope "v1", module: :v1 do
        #     match 'active',             to: 'resources#active',       via: 'get'
        # end
        # scope "(:version)", :version => /v2/, module: :v2 do    # default version
        #     match 'active',             to: 'resources#active2',       via: 'get'
        # end
    end

    draw(:oydid)
    draw(:extend)

    # Administrative ================
    match '/version',   to: 'application#version', via: 'get'
    match ':not_found', to: 'application#missing', via: [:get, :post], :constraints => { :not_found => /.*/ }
end
