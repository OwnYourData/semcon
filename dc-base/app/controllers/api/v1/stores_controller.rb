module Api
    module V1
        class StoresController < ApiController
            include Pagy::Backend
            include StoresHelper
            include HooksHelper

            rescue_from ActionDispatch::Http::Parameters::ParseError do |exception|
                render status: 400, json: { errors: [ exception.cause.message ] }
            end

            after_action { pagy_headers_merge(@pagy) if @pagy }

            def write
                input = params.permit!["data", "meta"].to_hash.transform_keys(&:to_s) rescue nil
                did_document = params.permit!["did-document"].to_hash rescue nil
                did_log = params.permit!["did-log"] rescue nil
                if input.nil?
                    input = params.permit!.except(:format, :controller, :action, :store).to_hash rescue nil
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
                    item_data = input["data"] rescue nil
                    meta_data = input["meta"] #.except(:schema, "schema") rescue nil
                    schema = input["meta"]["schema"] rescue nil
                else
                    if input.is_a?(Array) || input["data"].nil?
                        # Anything
                        if input.is_a?(Array)
                            item_data = input
                        else
                            item_data = input.except(:meta, "meta", :schema, "schema")
                            meta_data = input["meta"] #.except(:schema, "schema") rescue nil
                            schema = input["meta"]["schema"] rescue nil
                        end
                    else
                        data_content = input["data"]["content"] rescue nil
                        if data_content.nil?
                            # Plain data
                            if input["data"].is_a?(Array)
                                item_data = input["data"]
                            else
                                item_data = input["data"].except(:meta, "meta", :schema, "schema")
                            end
                            meta_data = input["meta"] #.except(:schema, "schema") rescue nil
                            schema = input["meta"]["schema"] rescue nil
                        else
                            # Legacy Structured data
                            item_data = input["data"]["content"]
                            meta_data = input["data"]["meta"] #.except(:schema, "schema") rescue nil
                            schema = input["data"]["meta"]["schema"] rescue nil
                        end
                    end
                end
                if params[:f].to_s.downcase == "array" && item_data.is_a?(Array)
                    retVal = []
                    item_data.each do |i|
                        if meta_data.nil?
                            i_data = i.except(:meta, "meta", :schema, "schema")
                            m_data = i["meta"] #.except(:schema, "schema") rescue nil
                            schema = i["meta"]["schema"] rescue nil
                            i_retVal = write_item(i_data, m_data, schema, nil, nil)
                        else
                            i_retVal = write_item(i, meta_data, schema, nil, nil)
                        end
                        retVal << i_retVal
                    end
                else
                    retVal = write_item(item_data, meta_data, schema, did_document, did_log)
                end
                write_hook(retVal)
                render json: retVal,
                       status: 200

            end

            def read
                # Examples for query_params
                # GET /api/data?value=1
                # echo '{"query":{"meta-not":{"processed": true}}}' | \
                #    curl  -H "Content-Type: application/json" -d @- -X GET http://localhost:3500/api/data
                query_params = request.query_parameters rescue {}
                if !params[:query].nil?
                    query_body = params.permit![:query].to_hash
                    query_params = query_params.merge(query_body)
                end

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
                    @pagy, @store = pagy(Store.where(schema: schema).order(id: :asc), page: page, items: items)
                else
                    if query_params.except(:page, :items, :f, "f") == {}
                        @pagy, @store = pagy(Store.all.order(id: :asc), page: page, items: items)
                    else
                        if Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql"
                            # query_params: https://www.cstutorial.org/ruby-on-rails/how-to-query-postgresqls-json-fields-from-rails
                            if ["data", "data-not", "meta", "meta-not"].any? {|k| query_params.key?(k)}
                                query_string = ""
                                if query_params.key?("data")
                                    if query_string == ""
                                        query_string = "item @> '" + query_params["data"].to_json + "'"
                                    else
                                        query_string += " AND item @> '" + query_params["data"].to_json + "'"
                                    end
                                end
                                if query_params.key?("meta")
                                    if query_string == ""
                                        query_string = "meta @> '" + query_params["meta"].to_json + "'"
                                    else
                                        query_string += " AND meta @> '" + query_params["meta"].to_json + "'"
                                    end
                                end
                                not_query_string = ""
                                if query_params.key?("data-not")
                                    if not_query_string == ""
                                        not_query_string = "item @> '" + query_params["data-not"].to_json + "'"
                                    else
                                        not_query_string += " AND item @> '" + query_params["data-not"].to_json + "'"
                                    end
                                end
                                if query_params.key?("meta-not")
                                    if not_query_string == ""
                                        not_query_string = "meta @> '" + query_params["meta-not"].to_json + "'"
                                    else
                                        not_query_string += " AND meta @> '" + query_params["meta-not"].to_json + "'"
                                    end
                                end
                                @store = Store.where(query_string).where.not(not_query_string).order(id: :asc)
                            else
                                @store = Store.where('item @> ?', query_params.to_json).order(id: :asc)
                            end
                        end
                    end
                end
                if @store.nil?
                    render json: {"error": "not found"},
                           status: 404
                elsif @store == []
                    render json: {"error": "not found"},
                           status: 404
                else
                    if !(ENV["AUTH"].to_s == "" || ENV["AUTH"].to_s.downcase == "false")
                        @at = Doorkeeper::AccessToken.find_by_token(doorkeeper_token.token) rescue nil
                        if @at.nil?
                            render json: {"error": "Unauthorized"},
                                   status: 401
                            return
                        end
                        if @at.public_key.to_s != ""
                            @did = Did.find_by_did(@store.did)
                            did_doc = @did["doc"]
                            if did_doc.is_a?(String)
                                did_doc = JSON.parse(did_doc)
                            end
                            did_public_key = did_doc["key"].split(":").first rescue ""
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
                        when "plain"
                            retVal = @store.select(:item)
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
                        when "plain"
                            retVal = @store.item
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
                        case params[:f]
                        when "plain"
                            if retVal["item"].nil?
                                if retVal.is_a?(String)
                                    response_object = JSON.parse(retVal)
                                else
                                    response_object = retVal
                                end
                            else
                                if retVal["item"].is_a?(String)
                                    response_object["data"] = JSON.parse(retVal["item"])
                                else
                                    response_object["data"] = retVal["item"]
                                end
                            end
                        else
                            schema = nil
                            if retVal["item"].nil?
                                if params[:f] != "meta"
                                    if retVal.is_a?(String)
                                        response_object["data"] = JSON.parse(retVal)
                                    else
                                        response_object["data"] = retVal
                                    end
                                end
                            else
                                if retVal["item"].is_a?(String)
                                    response_object["data"] = JSON.parse(retVal["item"])
                                else
                                    response_object["data"] = retVal["item"]
                                end
                            end
                            if retVal["meta"].nil? || retVal["meta"] == {}
                                if !retVal["schema"].nil?
                                    retVal["meta"]={"schema": retVal["schema"]}
                                end
                            else
                                if retVal["meta"].is_a?(String)
                                    response_object["meta"] = JSON.parse(retVal["meta"])
                                else
                                    response_object["meta"] = retVal["meta"]
                                end
                                if !retVal["schema"].nil?
                                    response_object["meta"]["schema"] = retVal["schema"]
                                end
                            end
                            response_object["id"] = retVal["id"]
                            response_object["dri"] = retVal["dri"]
                        end
                    else
                        response_array = []
                        iteration_object = retVal.dup
                        iteration_object.each do |i|
                            retVal = JSON.parse(i.to_json)
                            response_object = {}
                            case params[:f]
                            when "plain"
                                if retVal["item"].nil?
                                    if retVal.is_a?(String)
                                        response_object = JSON.parse(retVal)
                                    else
                                        response_object = retVal
                                    end
                                else
                                    if retVal["item"].is_a?(String)
                                        response_object = JSON.parse(retVal["item"])
                                    else
                                        response_object = retVal["item"]
                                    end
                                end
                            else
                                if retVal["item"].nil?
                                    if params[:f] != "meta"
                                        response_object["data"] = retVal
                                    end
                                else
                                    response_object["data"] = retVal["item"]
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
                                    if !retVal["schema"].nil?
                                        response_object["meta"]["schema"] = retVal["schema"]
                                    end
                                end
                                response_object["id"] = retVal["id"]
                                response_object["dri"] = retVal["dri"]
                            end
                            if response_object != {}
                                response_array << response_object
                            end
                        end
                        response_object = response_array
                    end
                    if !params[:schema].nil?
                        if !response_object.is_a?(Array)
                            response_object = [response_object]
                        end
                    end
                    read_hook(response_object)
                    render json: response_object,
                           status: 200
                end
            end

            def update
                input = params.permit!["data"].to_hash rescue nil
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
                        meta_data = input["meta"] #.except(:schema, "schema") rescue nil
                        schema = input["meta"]["schema"] rescue nil
                    end
                else
                    data_content = input["data"]["content"] rescue nil
                    if data_content.nil?
                        # Plain data
                        if input["data"].is_a?(Array)
                            item_data = input["data"]
                        else
                            item_data = input["data"].except(:meta, "meta", :schema, "schema")
                        end
                        meta_data = input["meta"] #.except(:schema, "schema") rescue nil
                        schema = input["meta"]["schema"] rescue nil
                    else
                        # Legacy Structured data
                        item_data = input["data"]["content"]
                        meta_data = input["data"]["meta"] #.except(:schema, "schema") rescue nil
                        schema = input["data"]["meta"]["schema"] rescue nil
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

                    retVal = {"dri": new_dri.to_s, "id": @store.id}
                    update_hook(retVal)
                    render json: retVal,
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
                        retVal = {"dri": new_dri.to_s, "id": @store.id, "removed":{"dri": old_dri, "id": old_id}}
                    else
                        retVal = {"dri": new_dri.to_s, "id": @store.id}
                    end
                    update_hook(retVal)
                    render json: retVal,
                           status: 200
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

                retVal = {"dri": dri.to_s, "id": id}
                delete_hook(retVal)
                render json: retVal,
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