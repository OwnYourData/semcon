# -*- encoding: utf-8 -*-
# frozen_string_literal: true

class Semcon

    # basic functions ---------------------------
    def self.host_from_did(did, filter, options)
        result, err_msg = Oydid.read(did, options)
        if result.nil? || err_msg != ""
            return [nil, err_msg]
        end
        result_url = ""
        w3c_did = Oydid.w3c(result, options)
        service_array = w3c_did["service"]
        service_array.each do |service|
            if service["type"] == filter
                case filter
                when "DecentralizedWebNode"
                    nodes = service["serviceEndpoint"]["nodes"] rescue nil
                    if nodes.nil?
                        next
                    end
                    result_url = service["serviceEndpoint"]["nodes"].first rescue nil
                    if nodes.nil?
                        next
                    end
                    break
                else
                    result_url = service["serviceEndpoint"].to_s
                    break
                end
            end
        end unless service_array.nil?
        if result_url.to_s == ""
            return [nil, "Service Endpoint URL not found in " + did.to_s]
        else
            return [result_url, ""]
        end
    end

    # OAuth functions ---------------------------
    def self.oauth_headers(token)
        { 'Accept' => '*/*',
          'Content-Type' => 'application/json',
          'Authorization' => 'Bearer ' + token.to_s
        }
    end

    def self.oauth_token(url, key, secret)
        auth_url = url.to_s + "/oauth/token"
        response_nil = false
        begin
            response = HTTParty.post(auth_url, 
                headers: { 'Content-Type' => 'application/json' },
                body: { client_id: key, 
                    client_secret: secret, 
                    grant_type: "client_credentials" }.to_json )
        rescue => e
            return [nil, e.message.to_s]
        end
        if !response_nil && !response.body.nil? && response.code == 200
            return [response.parsed_response["access_token"].to_s, ""]
        else
            return ["", response.code.to_s]
        end
    end
end
