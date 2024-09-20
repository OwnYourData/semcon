module StoresHelper
    def write_item(item_data, meta_data, schema, did_document, did_log)
        if meta_data.nil?
            dri = Oydid.hash(Oydid.canonical(item_data.to_json))
        else
            dri = Oydid.hash(Oydid.canonical({"data": item_data, "meta": meta_data}.to_json))
        end

        if did_document.nil?
            @store = Store.find_by_dri(dri)
            if @store.nil?
                if HAS_JSONB
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
                if HAS_JSONB
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
            return {"dri": dri.to_s, "id": @store.id}
        else
            did = Oydid.hash(Oydid.canonical(did_document.to_json)) rescue nil
            if HAS_JSONB
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

            create_entry = did_log.first.to_json rescue []
            terminate_entry = did_log.last.to_json rescue []
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

            return {"did": "did:oyd:" + did + LOCATION_PREFIX + did_document["log"].split(LOCATION_PREFIX).last}
        end
    end
end