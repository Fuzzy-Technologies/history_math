# frozen_string_literal: true

require "open3"

module FixtureImageRevision
  def self.read
    root = File.expand_path("..", __dir__)
    output, error, status = Open3.capture3("git", "-C", root, "rev-parse", "--verify", "HEAD")
    revision = output.strip
    unless status.success? && revision.match?(/\A[a-f0-9]{40}\z/)
      raise "Cannot pin fixture images to the source checkout: #{error.strip}"
    end
    revision
  end
end
