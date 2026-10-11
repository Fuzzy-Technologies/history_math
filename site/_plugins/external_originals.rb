# frozen_string_literal: true

require "json"
require "digest"

module HistoryMath
  EXTERNAL_ORIGINAL_REPOSITORY = "Fuzzy-Technologies/history_math"
  EXTERNAL_ORIGINAL_PATH = %r{\A/assets/images/([a-z0-9][a-z0-9-]*)/([a-z0-9][a-z0-9.-]*)\.(png|jpg|jpeg|webp|gif|svg)\z}
  EXTERNAL_ORIGINAL_SHA = /\A[a-f0-9]{64}\z/
  EXTERNAL_ORIGINAL_KEYS = %w[api_url asset_id bytes release_tag sha256 storage url].freeze

  def self.positive_asset_integer?(value)
    value.is_a?(Integer) && value.positive? && value <= 9_007_199_254_740_991
  end

  def self.external_asset_name(path, sha256)
    match = path.is_a?(String) && EXTERNAL_ORIGINAL_PATH.match(path)
    raise ArgumentError, "Invalid external original identity" unless match && !path.include?("..") && sha256.is_a?(String) && EXTERNAL_ORIGINAL_SHA.match?(sha256)
    "#{match[1]}-#{match[2]}-#{sha256}.#{match[3]}"
  end

  def self.external_original(entry, path)
    return nil unless entry.is_a?(Hash) && entry.key?("external_original")
    external = entry["external_original"]
    name = external_asset_name(path, entry["sha256"])
    tag = "article-originals-#{entry['sha256'][0]}"
    valid = external.is_a?(Hash) && external.keys.sort == EXTERNAL_ORIGINAL_KEYS && external["storage"] == "github-release" &&
      positive_asset_integer?(external["asset_id"]) && positive_asset_integer?(entry["bytes"]) &&
      positive_asset_integer?(entry["width"]) && positive_asset_integer?(entry["height"]) &&
      [true, false].include?(entry["logo"]) && external["sha256"] == entry["sha256"] &&
      external["bytes"] == entry["bytes"] && external["release_tag"] == tag &&
      external["url"] == "https://github.com/#{EXTERNAL_ORIGINAL_REPOSITORY}/releases/download/#{tag}/#{name}" &&
      external["api_url"] == "https://api.github.com/repos/#{EXTERNAL_ORIGINAL_REPOSITORY}/releases/assets/#{external['asset_id']}"
    raise ArgumentError, "Invalid external original descriptor: #{path}" unless valid
    external
  end

  def self.external_image_inventory(site_source)
    manifest = File.join(site_source, "_data", "image_assets.json")
    inventory = File.file?(manifest) ? JSON.parse(File.read(manifest)) : {}
    raise ArgumentError, "Invalid image inventory" unless inventory.is_a?(Hash)
    Dir.glob(File.join(site_source, "_data", "article_image_assets", "*.json")).sort.each do |fragment|
      entries = JSON.parse(File.read(fragment))
      raise ArgumentError, "Invalid image manifest fragment" unless entries.is_a?(Hash)
      raise ArgumentError, "Duplicate image manifest entry" unless (inventory.keys & entries.keys).empty?
      inventory.merge!(entries)
    end
    inventory
  end

  def self.local_asset_file(site_source, path)
    source = File.realpath(site_source)
    target = File.realpath(File.join(source, path.delete_prefix("/")))
    raise ArgumentError, "Unsafe image asset: #{path}" unless target.start_with?(source + File::SEPARATOR) && File.file?(target)
    target
  rescue SystemCallError => error
    raise ArgumentError, "Unavailable image asset: #{path} (#{error.class})"
  end

  def self.validate_external_previews!(entry, site_source)
    variants = entry["variants"]
    raise ArgumentError, "Missing external original preview" unless variants.is_a?(Array) && !variants.empty?
    paths = []
    variants.each do |variant|
      path = variant.is_a?(Hash) && variant["path"]
      valid = path.is_a?(String) && path.match?(%r{\A/assets/images/previews/[a-z0-9-]+/[a-z0-9][a-z0-9._-]*\z}) &&
        !path.include?("..") && !paths.include?(path) &&
        variant["sha256"].is_a?(String) && EXTERNAL_ORIGINAL_SHA.match?(variant["sha256"]) &&
        %w[bytes width height].all? { |key| positive_asset_integer?(variant[key]) } &&
        variant["width"] <= entry["width"] && variant["height"] <= entry["height"]
      raise ArgumentError, "Invalid external original preview" unless valid
      paths << path
      bytes = File.binread(local_asset_file(site_source, path))
      raise ArgumentError, "Changed external original preview: #{path}" unless bytes.bytesize == variant["bytes"] && Digest::SHA256.hexdigest(bytes) == variant["sha256"]
    end
    variants
  end

  def self.update_asset_digest!(digest, site_source, path, inventory = nil)
    raise ArgumentError, "Invalid review asset path" unless path.is_a?(String) && path.match?(%r{\A/assets/images/[a-z0-9-]+/[A-Za-z0-9._-]+\z}) && !path.include?("..")
    digest.update("\0#{path}\0")
    if File.exist?(File.join(site_source, path.delete_prefix("/")))
      digest.update(File.binread(local_asset_file(site_source, path)))
      return digest
    end
    entry = (inventory || external_image_inventory(site_source))[path]
    external = external_original(entry, path)
    raise ArgumentError, "Missing original image: #{path}" unless external
    validate_external_previews!(entry, site_source)
    digest.update("external-original-v1\0#{entry['sha256']}\0#{entry['bytes']}\0#{entry['width']}\0#{entry['height']}\0#{entry['logo']}\0#{external['storage']}\0#{external['url']}\0#{external['api_url']}\0#{external['asset_id']}\0#{external['release_tag']}\0")
    entry["variants"].sort_by { |variant| variant["path"] }.each do |variant|
      digest.update("\0#{variant['path']}\0#{variant['width']}\0#{variant['height']}\0#{variant['sha256']}\0#{variant['bytes']}\0")
      digest.update(File.binread(local_asset_file(site_source, variant["path"])))
    end
    digest
  end
end
