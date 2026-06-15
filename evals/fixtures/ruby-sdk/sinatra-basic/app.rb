require "sinatra/base"

class MyApp < Sinatra::Base
  get "/" do
    "Hello, world!"
  end

  get "/health" do
    status 200
    "OK"
  end
end
