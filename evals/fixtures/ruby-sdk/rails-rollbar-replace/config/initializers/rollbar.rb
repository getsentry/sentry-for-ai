Rollbar.configure do |config|
  config.access_token = ENV["ROLLBAR_ACCESS_TOKEN"]
  config.environment = ENV.fetch("ROLLBAR_ENV", Rails.env)
  config.enabled = Rails.env.production? || Rails.env.staging?
  config.framework = "Rails"

  config.person_method = "current_user"
  config.person_id_method = "id"
  config.person_email_method = "email"

  config.scrub_fields |= [:password, :password_confirmation, :secret]
  config.use_async = true
end
