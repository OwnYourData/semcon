#!/usr/bin/env ruby -rubygems
# -*- encoding: utf-8 -*-

Gem::Specification.new do |gem|
    gem.version               = File.read('VERSION').chomp
    gem.date                  = File.mtime('VERSION').strftime('%Y-%m-%d')

    gem.name                  = "semcon"
    gem.homepage              = "http://github.com/ownyourdata/semcon"
    gem.license               = 'MIT'
    gem.summary               = "Semantic Container handling in Ruby."
    gem.description           = "This gem provides the basic methods for managing Semantic Containers."
    gem.metadata           = {
        "documentation_uri" => "https://ownyourdata.github.io/semcon",
        "bug_tracker_uri"   => "https://github.com/ownyourdata/semcon/issues",
        "homepage_uri"      => "http://github.com/ownyourdata/semcon",
        "source_code_uri"   => "http://github.com/ownyourdata/semcon/tree/main/ruby-gem",
    }

    gem.authors               = ['Christoph Fabianek']

    gem.platform              = Gem::Platform::RUBY
    gem.files                 = %w(AUTHORS README.md LICENSE VERSION) + Dir.glob('lib/**/*.rb')
    gem.test_files            = Dir.glob('spec/**/*.rb') + Dir.glob('spec/**/*.json') + Dir.glob('spec/**/*.doc')

    gem.required_ruby_version = '>= 2.6.9'
    gem.requirements          = []
    gem.add_dependency 'httparty',              '~> 0.21'
    gem.add_dependency 'oydid',                 '~> 0.5.3'

    gem.add_development_dependency 'rspec',     '~> 3.10'

    gem.post_install_message = nil
end