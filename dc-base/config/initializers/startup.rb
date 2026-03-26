begin
    if Doorkeeper::Application.count == 0
        Doorkeeper::Application.create!({ 
            name: 'main', 
            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
            scopes: 'admin write read'})
    end
    puts 'APP_KEY: ' + Doorkeeper::Application.first.uid
    puts 'APP_SEC: ' + Doorkeeper::Application.first.secret
rescue Exception => e  
    puts e.message
end