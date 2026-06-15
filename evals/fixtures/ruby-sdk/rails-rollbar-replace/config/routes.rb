Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  resources :posts, only: [:index, :create]
  root "posts#index"
end
