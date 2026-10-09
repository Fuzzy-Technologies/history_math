# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "json"
require "digest"

class TranslationNoticesTest < Minitest::Test
  def with_site
    Dir.mktmpdir("history-math-test") do |root|
      source = File.join(root, "site")
      FileUtils.cp_r(File.expand_path("../site", __dir__), source)
      FileUtils.cp_r(File.expand_path("../schemas", __dir__), File.join(root, "schemas"))
      FileUtils.cp_r(File.expand_path("../reviews", __dir__), File.join(root, "reviews"))
      Dir.glob(File.expand_path("fixtures/articles/*.md", __dir__)).each { |file| FileUtils.cp(file, File.join(source, "_articles")) }
      config = Jekyll.configuration("config" => File.expand_path("../_config.yml", __dir__),
        "source" => source, "destination" => File.join(root, "output"), "quiet" => true)
      yield source, config
    end
  end

  def test_translation_notices_follow_the_source_publication_boundary
    with_site do |source, config|
      id = "hm-0b1ea17c8b02"
      Dir.glob(File.join(source, "_articles/hm-*.md")).each do |path|
        File.write(path, File.read(path).sub("status: published", "status: draft"))
      end
      site = Jekyll::Site.new(config)
      site.process
      refute File.exist?(File.join(site.dest, "articles/#{id}/index.html"))
      config["article_review"] = true
      review = Jekyll::Site.new(config)
      review.process
      html = File.read(File.join(review.dest, "articles/#{id}/index.html"))
      assert_includes html, "An English translation of this article is not available yet."
      assert_includes html, "/history_math/ru/articles/#{id}/"
      assert_includes html, "noindex, nofollow"
      refute_includes html, "hreflang="
      refute_includes html, "property=\"og:type\" content=\"article\""
      assert_empty JSON.parse(File.read(File.join(review.dest, "assets/search-en.json")))
      refute_includes File.read(File.join(review.dest, "sitemap.xml")), "/articles/#{id}/"
      russian = File.read(File.join(review.dest, "ru/articles/#{id}/index.html"))
      assert_includes russian, "English translation status"
      refute_includes russian, "hreflang=\"en\""
      refute_includes File.read(File.join(review.dest, "index.html")), "<h2>Articles available in Russian</h2>"
    end
  end

  def test_published_notice_links_and_replacement_by_real_translation
    with_site do |source, config|
      reviews = File.expand_path("../reviews", source)
      FileUtils.mkdir_p(reviews)
      ids = JSON.parse(File.read(File.join(source, "_data/english_notices.json"))).keys
      ids.each do |id|
        path = Dir.glob(File.join(source, "_articles/#{id}.*.md")).fetch(0)
        _, frontmatter, body = File.read(path).split("---", 3)
        metadata = YAML.safe_load(frontmatter, permitted_classes: [Date, Time])
        metadata.merge!({"status" => "published", "date" => "2026-10-09"})
        text = YAML.dump(metadata) + "---" + body
        File.write(path, text)
        digest = Digest::SHA256.new.update(text)
        paths = (metadata.fetch("figures", []).map { |figure| figure["path"] } +
          %w[preview_image cover_image hero_image].filter_map { |key| metadata[key] }).uniq.sort
        paths.each { |asset| digest.update("\0#{asset}\0").update(File.binread(File.join(source, asset.delete_prefix("/")))) }
        # Only this temporary fixture is approved; repository editorial decisions remain unchanged.
        File.write(File.join(reviews, "#{id}.json"), JSON.generate({"review_version" => 1, "article_id" => id,
          "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Test fixture",
            "date" => "2026-10-09", "package_sha256" => digest.hexdigest}}))
      end
      site = Jekyll::Site.new(config)
      site.process
      home = File.read(File.join(site.dest, "index.html"))
      assert_includes home, "Articles available in Russian"
      ids.each do |id|
        assert_includes home, "/history_math/articles/#{id}/"
        assert File.exist?(File.join(site.dest, "articles/#{id}/index.html"))
      end
      assert_empty JSON.parse(File.read(File.join(site.dest, "assets/search-en.json")))
      fixture = File.expand_path("../test-results/notices-fixture", __dir__)
      FileUtils.rm_rf(fixture)
      FileUtils.mkdir_p(File.dirname(fixture))
      FileUtils.cp_r(site.dest, fixture)

      id = ids.first
      translated = File.read(File.join(source, "_articles/demo-abacus.md"))
        .sub("lang: ru", "lang: en").sub("translation_key: demo-abacus", "translation_key: #{id}")
        .sub("permalink: /ru/articles/demo-abacus/", "permalink: /articles/#{id}/")
      File.write(File.join(source, "_articles/translated.en.md"), translated)
      translated_site = Jekyll::Site.new(config)
      translated_site.process
      html = File.read(File.join(translated_site.dest, "articles/#{id}/index.html"))
      refute_includes html, "An English translation of this article is not available yet."
      assert_includes html, "hreflang=\"ru\""

      File.delete(File.join(source, "_articles/translated.en.md"))
      File.write(File.join(source, "conflict.html"), "---\nlayout: page\nstatus: published\npermalink: /articles/#{id}/\n---\nConflict")
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
    end
  end
end
