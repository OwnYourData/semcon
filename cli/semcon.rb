#!/usr/bin/env ruby
# encoding: utf-8

require 'optparse'
require 'semcon'

VERSION = "0.0.1"

# user info -------------------------------

def print_version()
    puts VERSION.to_s + " (gem: v" + Gem.loaded_specs["semcon"].version.to_s + ")"
end

def print_help()
    puts "semcon - manage and interact with Semantic Containers [version " + VERSION + "]"
    puts ""
    puts "Usage: semcon [OPERATION] [OPTION]"
    puts ""
    puts "OPERATION"
    puts "  write    - uplad data, reads from STDIN"
    puts "  read     - read data for given DID"
    puts ""
    puts "OPTIONS"
    puts " -h, --help                        - dispay this help text"
    puts "     --json-output                 - write response as JSON object"
    puts "     --key-pwd                     - password for private key in DID Auth"
    puts "     --meta                        - specify meta attributes"
    puts "     --silent                      - suppress any output"
    puts " -z  --timestamp TIMESTAMP         - timestamp in UNIX epoch to be used"
    puts "                                     (only for testing)"
    puts " -v, --version                     - display version number"
end

# main -------------------------------

# commandline options
options = { }
opt_parser = OptionParser.new do |opt|
  opt.banner = "Usage: #{$0} OPERATION [OPTIONS]"
  opt.separator  ""
  opt.separator  "OPERATION"
  opt.separator  "OPTIONS"

  opt.on("--doc-enc DOCUMENTKEY-ENCODED") do |dp|
    options[:doc_enc] = dp
  end
  opt.on("--rev-enc REVOCATIONKEY-ENCODED") do |rp|
    options[:rev_enc] = rp
  end
  opt.on("--doc-pwd DOCUMENT-PASSWORD") do |dp|
    options[:doc_pwd] = dp
  end
  opt.on("--key-pwd PRIVATEKEY-PASSWORD") do |pk|
    options[:key_pwd] = pk
  end
  opt.on("--rev-pwd REVOCATION-PASSWORD") do |rp|
    options[:rev_pwd] = rp
  end
  opt.on("--json-output") do |j|
    options[:json] = true
  end
  opt.on("--meta META") do |m|
    options[:meta] = JSON.parse(m) rescue nil
  end
  opt.on("--silent") do |s|
    options[:silent] = true
  end
  opt.on("-h", "--help") do |h|
    print_help()
    exit(0)
  end
  opt.on("--return-secrets") do |rs|
    options[:return_secrets] = true
  end
  opt.on("-t", "--token TOKEN") do |t|
    options[:token] = t
  end
  opt.on("-z", "--timestamp TIMESTAMP") do |ts|
    options[:ts] = ts.to_i
  end
  opt.on("-v", "--version") do |h|
    print_version()
    exit(0)
  end
end
opt_parser.parse!

operation = ARGV.shift rescue ""
target = ARGV.shift rescue ""

# Read from STDIN
case operation.to_s
# JSON input
when "write"
    payload = []
    ARGF.each_line { |line| payload << line }
    payload = JSON.parse(payload.join("")) rescue nil
    if payload.nil?
        if options[:silent].nil? || !options[:silent]
            if options[:json].nil? || !options[:json]
                puts "Error: empty or invalid payload"
            else
                puts '{"error": "empty or invalid payload"}'
            end
        end
        exit(-1)
    end
end

case operation.to_s
when "write"
    retVal, err_msg = Semcon.write(payload, target, options)
    if err_msg.to_s == ""
        puts retVal.to_s
    else
        puts "Error: " + err_msg.to_s
    end
when "read"
    # puts "source: " + target.to_s
    retVal = ["error"]
    err_msg = ""
    if target.include?("?")
        target_url = target
    else
        target_url, err_msg = Semcon.host_from_did(target, "data", options)
    end
    if target_url.nil? || err_msg != ""
        retVal = {"error": err_msg}
    else
        retVal, err_msg = Semcon.read(target_url, options)
        if retVal.nil? || err_msg != ""
            retVal = {"error" => err_msg}
        end
    end
    puts retVal.to_json
else
    print_help()
end
