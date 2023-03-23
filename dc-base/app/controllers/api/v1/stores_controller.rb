module Api
    module V1
        class StoresController < ApiController
            include Pagy::Backend

            rescue_from ActionDispatch::Http::Parameters::ParseError do |exception|
                render status: 400, json: { errors: [ exception.cause.message ] }
            end

            after_action { pagy_headers_merge(@pagy) if @pagy }

            def write
                input = params.permit!["data"].to_hash rescue nil
                did_document = params.permit!["did-document"].to_hash rescue nil
                did_log = params.permit!["did-log"].to_hash rescue nil
                if input.nil?
                    input = params.permit!.except(:format, :controller, :action, :store).to_hash rescue nil
                else
                    input_meta = params.permit!["meta"].to_hash rescue nil
                    if !input_meta.nil?
                        input = params.permit!.except(:format, :controller, :action, :store).to_hash rescue nil
                    end
                end
                if !input["_json"].nil?
                    input = input["_json"]
                end
                if input.nil?
                    render json: {"error": "invalid input"},
                           status: 400
                    return
                end

                meta_data = nil
                schema = nil
                if !did_document.nil?
                    # DID
                    item_data = input["data"]["content"] rescue nil
                    meta_data = input["data"]["meta"].except(:schema, "schema") rescue nil
                    schema = input["data"]["meta"]["schema"] rescue nil
                else
                    if input.is_a?(Array) || input["data"].nil?
                        # Anything
                        if input.is_a?(Array)
                            item_data = input
                        else
                            item_data = input.except(:meta, "meta", :schema, "schema")
                            meta_data = input["meta"].except(:schema, "schema") rescue nil
                            schema = input["meta"]["schema"] rescue nil
                        end
                    else
                        if input["data"]["content"].nil?
                            # Plain data
                            item_data = input["data"].except(:meta, "meta", :schema, "schema")
                            meta_data = input["meta"].except(:schema, "schema") rescue nil
                            schema = input["meta"]["schema"] rescue nil
                        else
                            # Legacy Structured data
                            item_data = input["data"]["content"]
                            meta_data = input["data"]["meta"].except(:schema, "schema") rescue nil
                            schema = input["data"]["meta"]["schema"] rescue nil
                        end
                    end
                end
                if meta_data.nil?
                    dri = Oydid.hash(Oydid.canonical(item_data.to_json))
                else
                    dri = Oydid.hash(Oydid.canonical({"data": item_data, "meta": meta_data}.to_json))
                end

                if did_document.nil?
                    @store = Store.find_by_dri(dri)
                    if @store.nil?
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            @store = Store.new(item: item_data, meta: meta_data, dri: dri, schema: schema)
                        else
                            @store = Store.new
                            @store.item = item_data.to_json
                            if !meta_data.nil?
                                @store.meta = meta_data.to_json
                            end
                            @store.dri = dri
                            @store.schema = schema
                        end
                        @store.save
                    else
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            @store.item = item_data
                            @store.meta = meta_data
                        else
                            @store.item = item_data.to_json
                            if !meta_data.nil?
                                @store.meta = meta_data.to_json
                            end
                        end
                        @store.schema = schema
                        @store.save
                    end                        
                    render json: {"dri": dri.to_s, "id": @store.id},
                           status: 200
                else
                    did = Oydid.hash(Oydid.canonical(did_document.to_json)) rescue nil
                    if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                        @store = Store.new(item: item_data, meta: meta_data, dri: dri, schema: schema, did: did)
                    else
                        @store = Store.new
                        @store.item = item_data.to_json
                        if !meta_data.nil?
                            @store.meta = meta_data.to_json
                        end
                        @store.dri = dri
                        @store.schema = schema
                        @store.did = did
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
                    if query_params.except(:page, :items, :f, "f") == {}
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

                    retVal = []
                    store_count = @store.count rescue 1
                    if store_count > 1
                        case params[:f]
                        when "meta"
                            retVal = @store.select(:meta,:id,:dri,:schema)
                        else
                            retVal = @store.select(:item,:meta,:id,:dri,:schema)
                        end
                    else
                        if @store.class.to_s == "Store::ActiveRecord_Relation"
                            @store = @store.first
                        end
                        case params[:f]
                        when "meta"
                            retVal = {meta: @store.meta, id: @store.id, dri: @store.dri, schema: @store.schema}
                        else
                            retVal = {item: @store.item, meta: @store.meta, id: @store.id, dri: @store.dri, schema: @store.schema}
                        end
                    end

                    # create output format
                    if store_count == 1
                        retVal = JSON.parse(retVal.to_json)
                        response_object = {}
                        if !retVal["item"].nil?
                            if retVal["item"].is_a?(String)
                                response_object["data"] = JSON.parse(retVal["item"])
                            else
                                response_object["data"] = retVal["item"]
                            end
                        end
                        if retVal["meta"].nil?
                            if !retVal["schema"].nil?
                                retVal["meta"]={"schema": retVal["schema"]}
                            end
                        else
                            if retVal["meta"].is_a?(String)
                                response_object["meta"] = JSON.parse(retVal["meta"])
                            else
                                response_object["meta"] = retVal["meta"]
                            end
                            response_object["meta"]["schema"] = retVal["schema"]
                        end
                        response_object["id"] = retVal["id"]
                        response_object["dri"] = retVal["dri"]
                    else
                        response_array = []
                        iteration_object = retVal.dup
                        iteration_object.each do |i|
                            retVal = JSON.parse(i.to_json)
                            response_object = {}
                            if !retVal["item"].nil?
                                response_object["data"] = retVal["item"]
                            end
                            if retVal["meta"].nil?
                                if !retVal["schema"].nil?
                                    retVal["meta"]={"schema": retVal["schema"]}
                                end
                            else
                                response_object["meta"] = retVal["meta"]
                                response_object["meta"]["schema"] = retVal["schema"]
                            end
                            response_object["id"] = retVal["id"]
                            response_object["dri"] = retVal["dri"]
                            response_array << response_object
                        end
                        response_object = response_array
                    end
                    if !params[:schema].nil?
                        if !response_object.is_a?(Array)
                            response_object = [response_object]
                        end
                    end

                    render json: response_object,
                           status: 200
                end
            end

            def update
                input = params.permit!["data"].to_hash rescue nil
                input_meta = params.permit!["meta"].to_hash rescue nil
                if !input_meta.nil?
                    input = params.permit!.except(:format, "format", :controller, "controller", :action, "action", :store, "store").to_hash rescue nil
                end
                if input.nil?
                    input = params.permit!.except(:format, "format", :controller, "controller", :action, "action", :store, "store", :id, "id", :dri, "dri").to_hash rescue nil
                end
                if !input["_json"].nil?
                    input = input["_json"]
                end
                if input.nil?
                    render json: {"error": "invalid input"},
                           status: 400
                    return
                end
                dri = params[:dri].to_s
                id = params[:id].to_s
                @store = nil
                if dri != ""
                    @store = Store.find_by_dri(dri)
                elsif id != ""
                    @store = Store.find(id)
                end
                if @store.nil?
                    render json: {"error": "not found"},
                           status: 404
                    return
                end

                id = @store.id
                meta_data = nil
                schema = nil
                if input.is_a?(Array) || input["data"].nil?
                    # Anything
                    if input.is_a?(Array)
                        item_data = input
                    else
                        item_data = input.except(:meta, "meta", :schema, "schema")
                        meta_data = input["meta"].except(:schema, "schema") rescue nil
                        schema = input["meta"]["schema"] rescue nil
                    end
                else
                    if input["data"]["content"].nil?
                        # Plain data
                        item_data = input["data"].except(:meta, "meta", :schema, "schema")
                        meta_data = input["meta"].except(:schema, "schema") rescue nil
                        schema = input["meta"]["schema"] rescue nil
                    else
                        # Legacy Structured data
                        item_data = input["data"]["content"]
                        meta_data = input["data"]["meta"].except(:schema, "schema") rescue nil
                        schema = input["meta"]["schema"] rescue nil
                    end
                end
                if meta_data.nil?
                    new_dri = Oydid.hash(Oydid.canonical(item_data.to_json))
                else
                    new_dri = Oydid.hash(Oydid.canonical({"data": item_data, "meta": meta_data}.to_json))
                end

                @new_store = Store.find_by_dri(new_dri)

                if @new_store.nil?
                    if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                        @store.item = item_data
                        @store.meta = meta_data
                    else
                        @store.item = item_data.to_json
                        if !meta_data.nil?
                            @store.meta = meta_data.to_json
                        end
                    end
                    @store.dri = new_dri
                    @store.schema = schema
                    @store.save
                    render json: {"dri": new_dri.to_s, "id": @store.id},
                           status: 200
                else
                    if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                        @new_store.item = item_data
                        @new_store.meta = meta_data
                    else
                        @new_store.item = item_data.to_json
                        if !meta_data.nil?
                            @new_store.meta = meta_data.to_json
                        end
                    end
                    @new_store.dri = new_dri
                    @new_store.schema = schema
                    @new_store.save

                    old_dri = @store.dri
                    old_id = @store.id
                    if old_id.to_s != id.to_s
                        @store.destroy
                        render json: {"dri": new_dri.to_s, "id": @store.id, "removed":{"dri": old_dri, "id": old_id}},
                               status: 200
                    else
                        render json: {"dri": new_dri.to_s, "id": @store.id},
                               status: 200
                    end
                end
            end

            def delete
                dri = params[:dri].to_s
                id = params[:id].to_s
                @store = nil
                if dri != ""
                    @store = Store.find_by_dri(dri)
                elsif id != ""
                    @store = Store.find(id)
                end
                if @store.nil?
                    render json: {"error": "not found"},
                           status: 404
                    return
                end

                dri = @store.dri
                id = @store.id
                @store.destroy

                render json: {"dri": dri.to_s, "id": id},
                       status: 200

            end

            def schemas
                schema_list = Store.all.pluck(:schema).uniq.compact rescue []
                render json: schema_list,
                       status: 200
            end
        end
    end
end