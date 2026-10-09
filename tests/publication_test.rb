# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "json"

class PublicationTest < Minitest::Test
  def with_site
    Dir.mktmpdir("history-math-test") do |root|
      source = File.join(root, "site")
      FileUtils.cp_r(File.expand_path("../site", __dir__), source)
      FileUtils.cp_r(File.expand_path("../schemas", __dir__), File.join(root, "schemas"))
      FileUtils.cp_r(File.expand_path("../reviews", __dir__), File.join(root, "reviews"))
      config = Jekyll.configuration("config" => File.expand_path("../_config.yml", __dir__),
        "source" => source, "destination" => File.join(root, "output"), "quiet" => true)
      yield source, config
    end
  end

  def test_drafts_and_unknown_statuses_have_no_direct_url_or_index_entry
    with_site do |source, config|
      %w[draft internal].each do |status|
        text = File.read(File.join(source, "_articles/demo-abacus.md"))
          .sub("status: demo", "status: #{status}")
          .sub("translation_key: demo-abacus", "translation_key: #{status}-probe")
          .sub("permalink: /ru/articles/demo-abacus/", "permalink: /ru/articles/#{status}-probe/")
          .sub("title: Счёт, который можно потрогать", "title: #{status}-probe-marker")
        File.write(File.join(source, "_articles/#{status}-probe.md"), text)
      end
      File.write(File.join(source, "private.md"), "---\nlayout: page\nstatus: draft\npermalink: /private/\n---\nDRAFT_MARKER")
      File.write(File.join(source, "internal.txt"), "INTERNAL_MARKER")
      site = Jekyll::Site.new(config)
      site.process
      refute File.exist?(File.join(site.dest, "ru/articles/draft-probe/index.html"))
      refute File.exist?(File.join(site.dest, "ru/articles/internal-probe/index.html"))
      refute File.exist?(File.join(site.dest, "private/index.html"))
      refute File.exist?(File.join(site.dest, "internal.txt"))
      output = Dir.glob(File.join(site.dest, "**/*")).select { |path| File.file?(path) && path.match?(/\.(html|json|xml)\z/) }.map { |path| File.read(path) }.join
      refute_includes output, "draft-probe-marker"
      refute_includes output, "internal-probe-marker"
      refute_includes output, "DRAFT_MARKER"
      assert_empty JSON.parse(File.read(File.join(site.dest, "assets/search-en.json")))
    end
  end

  def test_invalid_published_metadata_fails_closed
    with_site do |source, config|
      path = File.join(source, "_articles/demo-abacus.md")
      File.write(path, File.read(path).sub("math: false", "math: maybe"))
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
    end
  end

  def test_duplicate_public_urls_fail_closed
    with_site do |source, config|
      FileUtils.cp(File.join(source, "_articles/demo-abacus.md"), File.join(source, "_articles/duplicate.md"))
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
    end
  end

  def test_review_preview_is_opt_in_and_never_indexes_a_draft
    with_site do |source, config|
      text = File.read(File.expand_path("../templates/minimal-article.md", __dir__))
      File.write(File.join(source, "_articles/example-minimal.en.md"), text)
      site = Jekyll::Site.new(config)
      site.process
      refute File.exist?(File.join(site.dest, "articles/example-minimal/index.html"))
      config["article_review"] = true
      review = Jekyll::Site.new(config)
      review.process
      page = File.read(File.join(review.dest, "articles/example-minimal/index.html"))
      assert_includes page, "Editorial review copy"
      assert_includes page, "noindex, nofollow"
      refute_includes File.read(File.join(review.dest, "sitemap.xml")), "/articles/example-minimal/"
      assert_empty JSON.parse(File.read(File.join(review.dest, "assets/search-en.json")))
    end
  end

  def test_publication_requires_approval_for_current_package_and_closed_blockers
    with_site do |source, config|
      path = File.join(source, "_articles/example-minimal.en.md")
      text = File.read(File.expand_path("../templates/minimal-article.md", __dir__))
        .sub("status: draft", "status: published\ndate: '2026-10-08'")
      File.write(path, text)
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
      reviews = File.expand_path("../reviews", source)
      FileUtils.mkdir_p(reviews)
      review_path = File.join(reviews, "example-minimal.json")
      review = {"review_version" => 1, "article_id" => "example-minimal", "questions" => [],
        "approval" => {"status" => "approved", "reviewed_by" => "Test editor", "date" => "2026-10-08",
          "package_sha256" => Digest::SHA256.hexdigest(text)}}
      File.write(review_path, JSON.generate(review))
      Jekyll::Site.new(config).process
      assert File.exist?(File.join(config["destination"], "articles/example-minimal/index.html"))
      File.write(path, text + "\nChanged after review.\n")
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
      File.write(path, text)
      review["questions"] = [{"id" => "source", "question" => "Confirm source", "blocking" => true, "state" => "open"}]
      File.write(review_path, JSON.generate(review))
      assert_raises(Jekyll::Errors::FatalException) { Jekyll::Site.new(config).process }
    end
  end

  def test_pdf_manifest_includes_both_languages_but_never_a_production_draft
    with_site do |source, config|
      text = File.read(File.join(source, "_articles/demo-geometry.md"))
        .sub("lang: ru", "lang: en")
        .sub("translation_key: demo-geometry", "translation_key: pdf-example")
        .sub("permalink: /ru/articles/demo-geometry/", "permalink: /articles/pdf-example/")
      File.write(File.join(source, "_articles/pdf-example.md"), text)
      File.write(File.join(source, "_articles/pdf-draft.md"), File.read(File.expand_path("../templates/minimal-article.md", __dir__)))
      site = Jekyll::Site.new(config)
      site.process
      manifest = JSON.parse(File.read(File.join(site.dest, "assets/article-pdfs.json")))
      assert_equal "/history_math", manifest["baseurl"]
      assert_equal %w[en ru], manifest["articles"].map { |item| item["lang"] }.uniq.sort
      refute manifest["articles"].any? { |item| item["url"].include?("example-minimal") }
      en = File.read(File.join(site.dest, "articles/pdf-example/index.html"))
      assert_includes en, "/history_math/assets/pdf/en/pdf-example.pdf"
      assert_includes en, "/history_math/assets/images/Math-with-Mansur-logo.png"
      destination = File.expand_path("../test-results/pdf-fixture", __dir__)
      FileUtils.rm_rf(destination)
      FileUtils.cp_r(site.dest, destination)
    end
  end
end
