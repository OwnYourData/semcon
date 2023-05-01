# -*- encoding: utf-8 -*-
# frozen_string_literal: true

require 'httparty'
require 'oydid'
require 'semcon/basic'

class Semcon
    def self.write(payload, target, options)
        write_payload = {"data": payload, "meta": {}}
        if !options[:meta].nil?
            write_payload[:meta] = options[:meta]
        end
        record_dri = Oydid.hash(Oydid.canonical(write_payload))

puts "Payload (semconlib)"
puts write_payload.to_json
puts "DRI (semconlib): " + record_dri.to_s

        target_url, err_msg = host_from_did(target, "DecentralizedWebNode", options)
        if target_url.nil? || err_msg != ""
            puts "Error: " +  err_msg.to_s
            return [nil, err_msg]
        end
        content = [
            {
                "id": "#data", 
                "type": "data", 
                "serviceEndpoint": target + "?dri="+record_dri
            }
        ]
        options[:location] = target_url
        options[:doc_location] = target_url
        options[:log_location] = target_url
        # did, didDocument, revoc_log, l1, l2, r1, privateKey, revocationKey, did_old, log_old, msg = Oydid.generate_base(content, "", "create", options)
        did_doc, did_key, did_log, msg = Oydid.generate_base(content, "", "create", options)
        did = did_doc[:did]
        didDocument = did_doc[:didDocument]
        did_old = did_doc[:did_old]
        revoc_log = did_log[:revoc_log]
        l1 = did_log[:l1]
        l2 = did_log[:l2]
        r1 = did_log[:r1]
        log_old = did_log[:log_old]

        semcon_object = {}
        semcon_object["data"] = write_payload
        semcon_object["did-document"] = didDocument
        semcon_object["did-log"] = [l1, l2]
        # puts "Write Object"
        # puts JSON.pretty_generate(semcon_object)

        if options[:token].to_s == ""
            retVal = HTTParty.post(target_url + "/api/data",
                headers: { 'Content-Type' => 'application/json' },
                body: semcon_object.to_json )
        else
            retVal = HTTParty.post(target_url + "/api/data",
                headers: { 'Content-Type' => 'application/json',
                           'Authorization' => 'Bearer ' + options[:token].to_s },
                body: semcon_object.to_json )
        end

        # puts "Response from dc-base:"
        # puts JSON.pretty_generate(retVal.parsed_response)

        err_msg = ""
        did = ""
        if retVal.code != 200
            err_msg = retVal.parsed_response["error"] rescue ""
            if err_msg == ""
                err_msg = "error " + retVal.code.to_s
            end
        else
            did = retVal.parsed_response["did"].to_s rescue nil
            if did.nil?
                err_msg = retVal.parsed_response["error"] rescue nil
            end
        end
        return [did, err_msg]
    end

    def self.read(target_url, options)
        dc_did = target_url.dup.split("?").first
        host_url, err_msg = host_from_did(dc_did, "DecentralizedWebNode", options)
        target_url = host_url.to_s + "/api/data?" + target_url.dup.split("?").last
        if options[:key_pwd].to_s != ""
            options[:token] = Oydid.token_from_challenge(host_url, options[:key_pwd]) rescue ""
        end
        if options[:token].to_s == ""
            retVal = HTTParty.get(target_url)
        else
            retVal = HTTParty.get(target_url,
                    headers: { 'Authorization' => 'Bearer ' + options[:token].to_s })
        end
        err_msg = ""
        if retVal.code == 200
            result = retVal.parsed_response
        else
            result = nil
            err_msg = retVal.response.message
        end

        return [result, err_msg]
    end
end

