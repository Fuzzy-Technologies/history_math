# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "json"
require "digest"
require "open3"

class ProductionDomainTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)

  def test_real_templates_keep_default_configured_and_explicit_reference_urls_separate
    Dir.mktmpdir("journal-domain-") do |root|
      source = File.join(root, "site")
      FileUtils.cp_r(File.join(ROOT, "site"), source)
      FileUtils.cp_r(File.join(ROOT, "schemas"), File.join(root, "schemas"))
      # Isolated fixtures exercise the actual templates/plugins, not archival edits.
      FileUtils.rm_rf(File.join(source, "_articles"))
      FileUtils.mkdir_p(File.join(source, "_articles"))
      FileUtils.mkdir_p(File.join(root, "reviews"))
      [["en", "pair", "published"], ["ru", "pair", "published"],
       ["ru", "unpaired", "published"], ["en", "unpaired", "draft"]].each do |lang, key, status|
        data = YAML.safe_load(File.read(File.join(ROOT, "templates/minimal-article.md")).split("---", 3)[1])
        id = "domain-#{key}-#{lang}"
        data.merge!({"article_id" => id, "source_work_id" => id, "translation_key" => "domain-#{key}",
          "lang" => lang, "status" => status, "permalink" => "/#{lang == 'ru' ? 'ru/' : ''}publications/#{id}/"})
        text = YAML.dump(data) + "---\n\nDomain regression fixture.\n"
        File.write(File.join(source, "_articles/#{id}.md"), text)
        File.write(File.join(root, "reviews/#{id}.json"), JSON.generate({"review_version" => 1, "article_id" => id,
          "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Fixture editor",
          "date" => "2026-10-31", "package_sha256" => Digest::SHA256.hexdigest(text)}}))
      end
      override, error, status = Open3.capture3({"PAGES_ORIGIN" => "https://history-math.org", "PAGES_BASE_PATH" => ""},
        "node", File.join(ROOT, "scripts/pages-config.mjs"))
      assert status.success?, error
      override_path = File.join(root, "pages.yml")
      File.write(override_path, override)
      scenarios = {"default" => [[], "https://history-math.org", ""],
        "configured" => [[override_path], "https://history-math.org", ""],
        "reference" => [[File.join(ROOT, "_config.reference.yml")], "https://fuzzy-technologies.github.io", "/history_math"]}
      scenarios.each do |name, (overrides, origin, base)|
        config = Jekyll.configuration("config" => [File.join(ROOT, "_config.yml"), *overrides],
          "source" => source, "destination" => File.join(root, name), "quiet" => true)
        site = Jekyll::Site.new(config)
        site.process
        %w[en ru].each do |lang|
          route = "/#{lang == 'ru' ? 'ru/' : ''}publications/domain-pair-#{lang}/"
          other_lang = lang == "ru" ? "en" : "ru"
          other_route = "/#{other_lang == 'ru' ? 'ru/' : ''}publications/domain-pair-#{other_lang}/"
          html = File.read(File.join(site.dest, route, "index.html"))
          expected = origin + base + route
          assert_includes html, %(<link rel="canonical" href="#{expected}">)
          assert_includes html, %(<meta property="og:url" content="#{expected}">)
          assert_includes html, %(hreflang="#{other_lang}" href="#{origin}#{base}#{other_route}")
          assert_includes html, %(<a href="#{base}#{other_route}" lang="#{other_lang}">)
          citation = html[/<p[^>]*data-article-citation[^>]*>(.*?)<\/p>/m, 1]
          refute_nil citation
          assert_includes citation, expected
          refute_includes citation, "fuzzy-technologies.github.io" if base.empty?
          assert_match(/class="print-source"><a href="#{Regexp.escape(expected)}"/, html)
          refute_match(/(?:href|src)="(?:https:\/\/history-math.org)?\/history_math\//, html) if base.empty?
        end
        unpaired = File.read(File.join(site.dest, "ru/publications/domain-unpaired-ru/index.html"))
        refute_includes unpaired, 'hreflang="en"'
        refute File.exist?(File.join(site.dest, "publications/domain-unpaired-en/index.html"))
        sitemap = File.read(File.join(site.dest, "sitemap.xml"))
        locations = sitemap.scan(/<loc>([^<]+)<\/loc>/).flatten
        assert_includes locations, origin + base + "/publications/domain-pair-en/"
        assert_includes locations, origin + base + "/ru/publications/domain-pair-ru/"
        locations.each { |url| assert url.start_with?(origin + base + "/"), url }
        manifest = JSON.parse(File.read(File.join(site.dest, "assets/article-pdfs.json")))
        assert_equal origin, manifest["origin"]
        assert_equal base, manifest["baseurl"]
        assert_equal 3, manifest["articles"].length
        manifest["articles"].each do |article|
          refute article["url"].start_with?("/history_math/")
          assert article["pdf_url"].start_with?("/assets/pdf/")
        end
      end
    end
  end
end
