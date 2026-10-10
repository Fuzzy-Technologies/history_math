# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "json"
require "digest"
require "yaml"

require_relative "../site/_plugins/external_urls"
require_relative "../site/_plugins/article_details"

class ArticleDetailsTest < Minitest::Test
  def test_ieee_author_order_limits_and_dates_preserve_verified_names
    registry = JSON.parse(File.read(File.expand_path("../site/_data/citation_authors.json", __dir__)))
    site = Struct.new(:data).new({"citation_authors" => registry})
    filter = Object.new.extend(HistoryMath::CitationFilters)
    filter.instance_variable_set(:@context, Liquid::Context.new({}, {}, {site: site}))
    assert_equal "M. F. Gilmullin", filter.citation_authors(["Mansur Gilmullin"], "en")
    assert_equal "Гильмуллин, М. Ф.", filter.citation_authors(["Мансур Гильмуллин"], "ru")
    assert_equal "A. Smith and B. Jones", filter.citation_authors(["A. Smith", "B. Jones"], "en")
    assert_equal "A. Smith, B. Jones, and Research Group", filter.citation_authors(["A. Smith", "B. Jones", "Research Group"], "en")
    names = (1..6).map { |i| "Author #{i}" }
    assert_equal "Author 1, Author 2, Author 3, Author 4, Author 5, and Author 6", filter.citation_authors(names, "en")
    assert_equal "Author 1 et al.", filter.citation_authors(names + ["Author 7"], "en")
    assert_equal (names + ["Author 7"]).join(", "), filter.citation_authors(names + ["Author 7"], "ru")
    assert_equal "May 1, 2026", filter.ieee_date("2026-05-01")
    assert_equal "Sep. 9, 2026", filter.ieee_date(Date.new(2026, 9, 9))
    assert_raises(Date::Error) { filter.ieee_date("2026-02-30") }
  end

  def test_external_urls_select_verified_locales_without_changing_resources
    filter = Object.new.extend(HistoryMath::ExternalUrls)
    assert_equal "https://fuzzy-technologies.github.io/ru/", filter.external_url("https://fuzzy-technologies.github.io/", "ru")
    assert_equal "https://fuzzy-technologies.github.io/", filter.external_url("https://fuzzy-technologies.github.io/ru/", "en")
    assert_equal "https://history-math.blogspot.com/?m=1&hl=ru#archive", filter.external_url("https://history-math.blogspot.com/?m=1&hl=en#archive", "ru")
    assert_equal "https://history-math.blogspot.com/?hl=en", filter.external_url("https://history-math.blogspot.com/", "en")
    url = "https://commons.wikimedia.org/wiki/File:Écu_louis_XII.jpg"
    assert_equal url + "?uselang=ru", filter.external_url(url, "ru")
    assert_equal "https://creativecommons.org/licenses/by-sa/3.0/deed.ru", filter.external_url("https://creativecommons.org/licenses/by-sa/3.0/", "ru")
    assert_equal "https://creativecommons.org/licenses/by-sa/3.0/deed.en", filter.external_url("https://creativecommons.org/licenses/by-sa/3.0/deed.ru", "en")
    %w[https://ridero.ru/books/bibliya_matematika/ https://t.me/tribute/app?startapp=hbuz https://oeis.org/A000396 /ru/articles/example/ https://fuzzy-technologies.github.io/history_math/ru/ https://creativecommons.org/licenses/by-sa/3.0/legalcode https://fuzzy-technologies.github.io.example.com/].each do |original|
      assert_equal original, filter.external_url(original, "ru")
    end
  end

  def with_site
    Dir.mktmpdir("history-math-details") do |root|
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
  def test_real_dates_author_forms_and_safe_draft_details
    with_site do |source, config|
      reviews = File.expand_path("../reviews", source)
      FileUtils.mkdir_p(reviews)
      %w[ru en].each do |language|
        data = YAML.safe_load(File.read(File.expand_path("../templates/minimal-article.md", __dir__)).split("---", 3)[1])
        id = "citation-#{language}"
        data.merge!({"article_id" => id, "source_work_id" => id, "translation_key" => id, "status" => "published",
          "date" => "2026-10-09", "updated" => "2026-10-10", "lang" => language,
          "title" => language == "ru" ? "Матрицы и окружности" : "Matrices and circles",
          "author" => language == "ru" ? "Мансур Гильмуллин" : "Mansur Gilmullin",
          "authors" => [language == "ru" ? "Мансур Гильмуллин" : "Mansur Gilmullin"],
          "permalink" => "/#{language == 'ru' ? 'ru/' : ''}articles/#{id}/",
          "original_publication" => {"outlet" => "Telegram", "date" => "2023-08-23"}})
        text = YAML.dump(data) + "---\n\nA short fixture article.\n"
        File.write(File.join(source, "_articles/#{id}.md"), text)
        File.write(File.join(reviews, "#{id}.json"), JSON.generate({"article_id" => id, "review_version" => 1,
          "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Test editor",
          "date" => "2026-10-09", "package_sha256" => Digest::SHA256.hexdigest(text)}}))
      end
      site = Jekyll::Site.new(config)
      site.process
      ru = File.read(File.join(site.dest, "ru/articles/citation-ru/index.html"))
      en = File.read(File.join(site.dest, "articles/citation-en/index.html"))
      assert_includes ru, "Гильмуллин, М. Ф. Матрицы и окружности //"
      assert_includes ru, "Дата публикации: 09.10.2026."
      assert_includes ru, "Дата обновления: 10.10.2026."
      assert_includes ru, "23.08.2023"
      assert_includes en, "Cite this article · IEEE"
      assert_includes en, "M. F. Gilmullin, “Matrices and circles,” <em>Mathematics with Mansur</em>, Oct. 9, 2026. Accessed:"
      assert_includes en, "[Online]. Available:"
      assert_includes en, "data-citation-access>Mon. D, YYYY</span>"
      refute_includes en, "APA"
      refute_match(/ISSN|DOI|Vol\./, ru + en)
      demo = File.read(File.join(site.dest, "ru/articles/demo-geometry/index.html"))
      refute_includes demo, "data-article-citation"
      destination = File.expand_path("../test-results/details-fixture", __dir__)
      FileUtils.rm_rf(destination)
      FileUtils.cp_r(site.dest, destination)
    end
  end
end
