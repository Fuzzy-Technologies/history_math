# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require_relative "../site/_plugins/image_assets"

class ImageOriginalsTest < Minitest::Test
  Site = Struct.new(:config, :source, :baseurl)

  def test_migration_originals_use_immutable_git_revision_only_in_production
    site = Site.new({"image_source_revision" => "a" * 40}, ".", "/history_math")
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
end
