require_relative "boot"
require "rails/all"

Bundler.require(*Rails.groups)

module MyApp
  class Application < Rails::Application
    config.load_defaults 8.1
    config.active_job.queue_adapter = :sidekiq
  end
end
