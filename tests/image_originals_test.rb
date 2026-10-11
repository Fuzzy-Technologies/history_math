# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "base64"
require_relative "../site/_plugins/image_assets"

class ImageOriginalsTest < Minitest::Test
  Site = Struct.new(:config, :source, :baseurl, :data, :static_files)
  StaticFile = Struct.new(:relative_path)
  ORIGINAL_PATH = "/assets/images/hm-tt-abc/diagram-01.png"
  PREVIEW_PATH = "/assets/images/previews/hm-tt-abc/diagram-01.png-1.png"
  PNG = Base64.decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/pkAAAAASUVORK5CYII=")

  def test_migration_originals_use_immutable_git_revision_only_in_production
    site = Site.new({"image_source_revision" => "a" * 40}, ".", "/history_math", {"image_assets" => {}})
    path = "/assets/images/hm-tt-abc/diagram-01.png"
    assert_equal "https://raw.githubusercontent.com/Fuzzy-Technologies/history_math/#{'a' * 40}/site#{path}", HistoryMath.original_image_url(site, path)
    site.config["article_review"] = true
    assert_equal "/history_math#{path}", HistoryMath.original_image_url(site, path)
    site.config["article_review"] = false
    assert_equal "/history_math/assets/images/pilot.png", HistoryMath.original_image_url(site, "/assets/images/pilot.png")
    site.config["image_source_revision"] = "master"
    assert_raises(Jekyll::Errors::FatalException) { HistoryMath.original_image_url(site, path) }
  end

  def test_only_migrated_originals_are_excluded_from_static_delivery
    assert_match HistoryMath::MIGRATED_ORIGINAL, "/assets/images/hm-tt-abc/diagram-01.png"
    refute_match HistoryMath::MIGRATED_ORIGINAL, "/assets/images/previews/hm-tt-abc/diagram-01.png-960.webp"
    refute_match HistoryMath::MIGRATED_ORIGINAL, "/assets/images/hm-99120459b820/diagram.png"
  end

  def test_external_originals_use_verified_release_location_in_review_and_production
    entry = external_entry
    site = external_site(".", entry)
    [true, false].each do |review|
      site.config["article_review"] = review
      assert_equal entry["external_original"]["url"], HistoryMath.original_image_url(site, ORIGINAL_PATH)
    end
  end

  def test_external_original_can_be_absent_when_preview_exists_and_matches
    Dir.mktmpdir do |source|
      write_asset(source, PREVIEW_PATH, PNG)
      site = external_site(source, external_entry)
      HistoryMath::ValidateImageAssets.new.generate(site)
      assert_equal [PREVIEW_PATH, "/assets/images/legacy.png"], site.static_files.map(&:relative_path)
      refute File.exist?(File.join(source, ORIGINAL_PATH.delete_prefix("/")))
    end
  end

  def test_external_original_still_checks_local_bytes_when_present
    Dir.mktmpdir do |source|
      write_asset(source, PREVIEW_PATH, PNG)
      write_asset(source, ORIGINAL_PATH, "modified original")
      site = external_site(source, external_entry)
      error = assert_raises(Jekyll::Errors::FatalException) { HistoryMath::ValidateImageAssets.new.generate(site) }
      assert_includes error.message, ORIGINAL_PATH
    end
  end

  def test_external_original_rejects_changed_or_missing_preview
    Dir.mktmpdir do |source|
      write_asset(source, PREVIEW_PATH, "modified preview")
      site = external_site(source, external_entry)
      assert_raises(Jekyll::Errors::FatalException) { HistoryMath::ValidateImageAssets.new.generate(site) }
      File.unlink(File.join(source, PREVIEW_PATH.delete_prefix("/")))
      assert_raises(Jekyll::Errors::FatalException) { HistoryMath::ValidateImageAssets.new.generate(site) }
    end
  end

  def test_external_original_rejects_foreign_storage_before_rendering
    entry = external_entry
    entry["external_original"]["api_url"] = "https://api.github.com/repos/another/repository/releases/assets/273"
    site = external_site(".", entry)
    assert_raises(ArgumentError) { HistoryMath.original_image_url(site, ORIGINAL_PATH) }
    assert_raises(Jekyll::Errors::FatalException) { HistoryMath::ValidateImageAssets.new.generate(site) }
  end

  private

  def external_entry
    sha256 = Digest::SHA256.hexdigest(PNG)
    tag = "article-originals-#{sha256[0]}"
    {"sha256" => sha256, "bytes" => PNG.bytesize, "width" => 1, "height" => 1, "logo" => false,
     "variants" => [{"path" => PREVIEW_PATH, "sha256" => sha256, "bytes" => PNG.bytesize, "width" => 1, "height" => 1}],
     "external_original" => {"storage" => "github-release", "sha256" => sha256, "bytes" => PNG.bytesize,
       "release_tag" => tag, "asset_id" => 273,
       "api_url" => "https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/273",
       "url" => "https://github.com/Fuzzy-Technologies/history_math/releases/download/#{tag}/hm-tt-abc-diagram-01-#{sha256}.png"}}
  end

  def external_site(source, entry)
    Site.new({"article_review" => true}, source, "/history_math", {"image_assets" => {ORIGINAL_PATH => entry}},
      [StaticFile.new(ORIGINAL_PATH), StaticFile.new(PREVIEW_PATH), StaticFile.new("/assets/images/legacy.png")])
  end

  def write_asset(source, path, bytes)
    filename = File.join(source, path.delete_prefix("/"))
    FileUtils.mkdir_p(File.dirname(filename))
    File.binwrite(filename, bytes)
  end
end
