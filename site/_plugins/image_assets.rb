# frozen_string_literal: true

require "digest"
require "open3"

module HistoryMath
  MIGRATED_ORIGINAL = %r{\A/assets/images/hm-tt-[a-z0-9]+/[a-z0-9.-]+\z}.freeze

  def self.original_image_url(site, path)
    unless path.to_s.match?(MIGRATED_ORIGINAL) && !site.config["article_review"]
      return "#{site.baseurl}#{path}"
    end
    revision = site.config["image_source_revision"] ||= Open3.capture3("git", "-C", site.source, "rev-parse", "HEAD").first.strip
    unless revision.match?(/\A[0-9a-f]{40}\z/)
      raise Jekyll::Errors::FatalException, "Cannot determine immutable original image revision"
    end
    "https://raw.githubusercontent.com/Fuzzy-Technologies/history_math/#{revision}/site#{path}"
  end

  def self.image_inventory(site)
    combined = site.data.fetch("image_assets").dup
    site.data.fetch("article_image_assets", {}).each_value do |fragment|
      if fragment.keys.any? { |path| combined.key?(path) }
        raise Jekyll::Errors::FatalException, "Duplicate image manifest entry"
      end
      combined.merge!(fragment)
    end
    combined
  end

  module ImageAssets
    def original_image_url(path)
      HistoryMath.original_image_url(@context.registers[:site], path)
    end

    def image_asset(path)
      site = @context.registers[:site]
      entry = HistoryMath.image_inventory(site).fetch(path, nil)
      if !entry && path.to_s.match?(/\.(png|jpe?g|webp|gif)\z/i)
        raise Jekyll::Errors::FatalException, "Missing lightweight image: #{path}; run tools/image_assets.py --write"
      end
      entry
    end
  end

  # Validate derivatives during every build, including review and deployment.
  class ValidateImageAssets < Jekyll::Generator
    safe false
    priority :highest

    def generate(site)
      HistoryMath.image_inventory(site).each do |original, entry|
        ([{"path" => original, "sha256" => entry.fetch("sha256")}] + entry.fetch("variants")).each do |asset|
          path = File.join(site.source, asset.fetch("path").delete_prefix("/"))
          unless File.file?(path) && Digest::SHA256.file(path).hexdigest == asset.fetch("sha256")
            raise Jekyll::Errors::FatalException, "Stale or missing image derivative: #{asset['path']}; run tools/image_assets.py --write"
          end
        end
      end
      # Reading variants belong in Pages; multi-gigabyte originals stay in Git.
      unless site.config["article_review"]
        site.static_files.reject! { |file| file.relative_path.match?(MIGRATED_ORIGINAL) }
      end
    end
  end
end

Liquid::Template.register_filter(HistoryMath::ImageAssets)
