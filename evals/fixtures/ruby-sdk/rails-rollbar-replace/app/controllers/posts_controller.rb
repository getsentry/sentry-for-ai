class PostsController < ApplicationController
  def index
    @posts = Post.all
  end

  def create
    @post = Post.new(post_params)

    if @post.save
      Rollbar.info("Post created", post_id: @post.id)
      redirect_to posts_path, notice: "Post was successfully created."
    else
      Rollbar.warning("Post creation failed", errors: @post.errors.full_messages)
      render :index, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rollbar.error(e, "Unexpected error creating post")
    redirect_to posts_path, alert: "Something went wrong."
  end

  private

  def post_params
    params.require(:post).permit(:title, :body)
  end
end
