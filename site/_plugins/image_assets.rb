# frozen_string_literal: true

require "digest"
require "open3"
require_relative "external_originals"

module HistoryMath
  MIGRATED_ORIGINAL = %r{\A/assets/images/hm-tt-[a-z0-9]+/[a-z0-9.-]+\z}.freeze

  def self.original_image_url(site, path)
    entry = image_inventory(site).fetch(path, nil)
    external = external_original(entry, path) if entry
    return external.fetch("url") if external

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
      external_paths = {}
      HistoryMath.image_inventory(site).each do |original, entry|
        external = HistoryMath.external_original(entry, original)
        if external
          HistoryMath.validate_external_previews!(entry, site.source)
          external_paths[original] = true
        end
        assets = entry.fetch("variants").dup
        original_path = File.join(site.source, original.delete_prefix("/"))
        assets.unshift({"path" => original, "sha256" => entry.fetch("sha256")}) if !external || File.file?(original_path)
        assets.each do |asset|
          path = File.join(site.source, asset.fetch("path").delete_prefix("/"))
          unless File.file?(path) && Digest::SHA256.file(path).hexdigest == asset.fetch("sha256")
            raise Jekyll::Errors::FatalException, "Stale or missing image derivative: #{asset['path']}; run tools/image_assets.py --write"
          end
        end
      rescue ArgumentError => error
        raise Jekyll::Errors::FatalException, "Invalid external original: #{original}; #{error.message}"
      end
      # Reading variants belong in Pages; migrated originals have separate storage.
      site.static_files.reject! do |file|
        external_paths.key?(file.relative_path) || (!site.config["article_review"] && file.relative_path.match?(MIGRATED_ORIGINAL))
      end
    end
  end
end

Liquid::Template.register_filter(HistoryMath::ImageAssets)
