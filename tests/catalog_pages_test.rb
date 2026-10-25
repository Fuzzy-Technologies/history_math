# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "yaml"
require_relative "../site/_plugins/catalog_pages"

class CatalogPagesTest < Minitest::Test
  def test_generator_emits_all_localized_routes_without_rendering_a_site
    Dir.mktmpdir("catalog-pages-") do |root|
      site = Jekyll::Site.new(Jekyll.configuration("source" => root, "destination" => File.join(root, "output"), "quiet" => true))
      article = Struct.new(:url, :data)
      site.data["discovery_documents"] = {}
      %w[en ru].each do |language|
        base = language == "ru" ? "/ru/publications/" : "/publications/"
        source = File.read(File.expand_path("../site/#{language == 'ru' ? 'ru/' : ''}publications.html", __dir__))
        metadata = YAML.safe_load(source.match(/\A---\n(.*?)\n---\n/m)[1])
        assert_equal base, metadata.fetch("permalink")
        entries = Array.new(190) { |index| article.new("/#{language}/article-#{index}/", {"tags" => ["History_of_mathematics"]}) }
        site.data["discovery_documents"][language] = entries
        page = Jekyll::PageWithoutAFile.new(site, site.source, base.delete_prefix("/"), "index.html")
        page.content = "{% include journal-catalog.html %}"
        page.data.merge!(metadata)
        site.pages << page
      end
      HistoryMath::CatalogPages.new.generate(site)
      %w[en ru].each do |language|
        pages = site.pages.select { |page| page.data["lang"] == language }.sort_by { |page| page.data["catalog_page"] }
        assert_equal 10, pages.length
        assert_equal site.data["discovery_documents"][language], pages.flat_map { |page| page.data["catalog_articles"] }
        assert_equal "catalog-page-10", pages.last.data["translation_key"]
        assert_equal ["History of Mathematics"], pages.last.data["catalog_tags"]
        assert_equal "{% include journal-catalog.html %}", pages.last.content
        assert_equal (language == "ru" ? "/ru/publications/page/10/" : "/publications/page/10/"), pages.last.url
      end
    end
  end

  def test_static_pages_preserve_every_article_exactly_once_in_order
    [0, 1, 20, 21, 190, 1000].each do |count|
      articles = Array.new(count) { |index| "/article-#{index}/" }
      %w[/publications/ /ru/publications/].each do |base|
        first = HistoryMath::CatalogPagination.data(articles, base, 1)
        pages = (1..first.fetch("catalog_page_count")).map { |page| HistoryMath::CatalogPagination.data(articles, base, page) }
        assert_equal articles, pages.flat_map { |page| page.fetch("catalog_articles") }
        assert pages.all? { |page| page.fetch("catalog_articles").length <= 20 }
        assert_nil pages.first.fetch("catalog_previous")
        assert_nil pages.last.fetch("catalog_next")
        assert_equal "#{base}page/2/", pages.first.fetch("catalog_next") if count > 20
        assert_equal base, pages[1].fetch("catalog_previous") if count > 20
      end
    end
  end

  def test_navigation_stays_bounded_and_retains_current_first_and_last_pages
    [1, 2, 3, 10, 50, 500].each do |count|
      (1..count).each do |current|
        numbers = HistoryMath::CatalogPagination.numbers(current, count)
        assert_operator numbers.length, :<=, 9
        [1, current, count].each { |page| assert_includes numbers, page }
        assert_equal numbers.grep(Integer).sort.uniq, numbers.grep(Integer)
      end
    end
  end
end
