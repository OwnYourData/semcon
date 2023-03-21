module Api
    module V1
        class StoresController < ApiController
            include Pagy::Backend

            rescue_from ActionDispatch::Http::Parameters::ParseError do |exception|
                render status: 400, json: { errors: [ exception.cause.message ] }
            end

            after_action { pagy_headers_merge(@pagy) if @pagy }

            def write
                data = params.permit!["data"].to_hash rescue nil
                did_document = params.permit!["did-document"].to_hash rescue nil
                did_log = params.permit!["did-log"].to_hash rescue nil
                if data.nil?
                    data = params.permit!.except(:format, :controller, :action, :store).to_hash rescue nil
                end
                if data.nil?
                    render json: {"error": "invalid input"},
                           status: 400
                    return
                end
                dri = Oydid.hash(Oydid.canonical(data.to_json))

                if did_document.nil?
                    @store = Store.find_by_dri(dri)
                    if @store.nil?
                        if data["content"].nil?
                            if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                                @store = Store.new(item: data, dri: dri)
                            else
                                @store = Store.new(item: data.to_json, dri: dri)
                            end
                        else
                            if data["meta"].nil?
                                if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                                    @store = Store.new(item: data["content"], dri: dri)
                                else
                                    @store = Store.new(item: data["content"].to_json, dri: dri)
                                end
                            else
                                if data["meta"]["schema"].nil?
                                    if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                                        @store = Store.new(item: data["content"], meta: data["meta"], dri: dri)
                                    else
                                        @store = Store.new(item: data["content"].to_json, meta: data["meta"].to_json, dri: dri)
                                    end
                                else
                                    if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                                        @store = Store.new(item: data["content"], meta: data["meta"].except(:schema, "schema"), dri: dri, schema: data["meta"]["schema"].to_s)
                                    else
                                        @store = Store.new(item: data["content"].to_json, meta: data["meta"].except(:schema, "schema").to_json, dri: dri, schema: data["meta"]["schema"].to_s)
                                    end
                                end
                            end
                        end
                        @store.save
                    end                        
                    render json: {"dri": dri.to_s},
                           status: 200
                else
                    did = Oydid.hash(Oydid.canonical(did_document.to_json)) rescue nil
                    if data["meta"]["schema"].nil?
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            @store = Store.new(item: data["content"], meta: data["meta"], dri: dri, did: did)
                        else
                            @store = Store.new(item: data["content"].to_json, meta: data["meta"].to_json, dri: dri, did: did)
                        end
                    else
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            @store = Store.new(item: data["content"], meta: data["meta"].except(:schema, "schema"), dri: dri, schema: data["meta"]["schema"].to_s, did: did)
                        else
                            @store = Store.new(item: data["content"].to_json, meta: data["meta"].except(:schema, "schema").to_json, dri: dri, schema: data["meta"]["schema"].to_s, did: did)
                        end
                    end
                    @store.save

                    create_entry = did_log.first.to_json
                    terminate_entry = did_log.last.to_json
                    @did = Did.find_by_did(did)
                    if @did.nil?
                        Did.new(did: did, doc: did_document.to_json).save
                    else
                        @did.doc = did_document.to_json
                        @did.save
                    end
                    create_hash = Oydid.hash(Oydid.canonical(create_entry))
                    @log = Log.find_by_oyd_hash(create_hash)
                    if @log.nil?
                        Log.new(did: did, item: create_entry, oyd_hash: create_hash, ts: Time.now.utc.to_i).save
                    end
                    terminate_hash = Oydid.hash(Oydid.canonical(terminate_entry))
                    @log = Log.find_by_oyd_hash(terminate_hash)
                    if @log.nil?
                        Log.new(did: did, item: terminate_entry, oyd_hash: terminate_hash, ts: Time.now.utc.to_i).save
                    end

                    render json: {"did": "did:oyd:" + did + LOCATION_PREFIX + did_document["log"].split(LOCATION_PREFIX).last},
                           status: 200
                end
            end

            def read
                query_params = request.query_parameters
                dri = params[:dri].to_s
                id = params[:id].to_s
                schema = params[:schema].to_s

                page = params[:page] || 1
                if page == "all"
                    page = 1
                    items = Store.count
                else
                    items = params[:items] || 20
                end

                if dri != ""
                    @store = Store.find_by_dri(dri)
                elsif id != ""
                    @store = Store.find(id)
                elsif schema != ""
                    @pagy, @store = pagy(Store.where(schema: schema), page: page, items: items)
                else
                    if query_params.except(:page, :items) == {}
                        @pagy, @store = pagy(Store.all, page: page, items: items)
                    else
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            # query_params: https://www.cstutorial.org/ruby-on-rails/how-to-query-postgresqls-json-fields-from-rails
                            @store = Store.where('item @> ?', query_params.to_json).first
                        end
                    end
                end
                if @store.nil?
                    render json: {"error": "not found"},
                           status: 404
                else
                    if !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false")
                        @at = Doorkeeper::AccessToken.find_by_token(doorkeeper_token.token)
                        if @at.public_key.to_s != ""
                            @did = Did.find_by_did(@store.did)
                            did_public_key = @did.doc["key"].split(":").first rescue ""
                            if @at.public_key.to_s != did_public_key
                                render json: {"error": "Unauthorized"},
                                       status: 401
                                return
                            end
                        end
                    end
                    if @store.count > 1
                        render json: @store.select(:item,:meta,:id,:dri,:schema),
                               status: 200
                    else
                        if @store.class.to_s == "Store::ActiveRecord_Relation"
                            @store = @store.first
                        end
                        render json: {item: @store.item, meta: @store.meta, id: @store.id, dri: @store.dri, schema: @store.schema},
                               status: 200
                    end
                end
            end

            def schemas
                schema_list = Store.all.pluck(:schema).uniq.compact rescue []
                render json: schema_list,
                       status: 200
            end
        end
    end
end