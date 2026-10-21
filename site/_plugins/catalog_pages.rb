# frozen_string_literal: true

require_relative "topics"

module HistoryMath
  module CatalogPagination
    PAGE_SIZE = 20

    def self.url(base, page)
      page == 1 ? base : "#{base}page/#{page}/"
    end

    def self.numbers(current, count)
      pages = [1, count, current - 1, current, current + 1].uniq.select { |page| page.between?(1, count) }.sort
      result = []
      pages.each do |page|
        previous = result.last
        result << (previous + 1) if previous.is_a?(Integer) && page - previous == 2
        result << "ellipsis" if previous.is_a?(Integer) && page - previous > 2
        result << page
      end
      result
    end

    def self.data(articles, base, page)
      count = [(articles.length.to_f / PAGE_SIZE).ceil, 1].max
      {"catalog_page" => page, "catalog_page_count" => count, "catalog_base" => base, "catalog_section" => true,
        "catalog_articles" => articles.slice((page - 1) * PAGE_SIZE, PAGE_SIZE) || [],
        "catalog_previous" => page > 1 ? url(base, page - 1) : nil,
        "catalog_next" => page < count ? url(base, page + 1) : nil,
        "catalog_navigation" => numbers(page, count).map { |number| number == "ellipsis" ? {"ellipsis" => true} :
          {"page" => number, "url" => url(base, number), "current" => number == page} }}
    end
  end

  class CatalogPages < Jekyll::Generator
    safe false
    priority :low

    def generate(site)
      roots = site.pages.select { |page| page.data["translation_key"] == "catalog" }
      roots.each do |root|
        language = root.data.fetch("lang")
        articles = site.data.fetch("discovery_documents").fetch(language)
        base = root.data.fetch("permalink")
        tags = Topics.labels(articles.flat_map { |article| article.data["tags"] }).sort
        first = CatalogPagination.data(articles, base, 1)
        root.data.merge!(first).merge!("catalog_tags" => tags)
        (2..first.fetch("catalog_page_count")).each do |number|
          path = CatalogPagination.url(base, number)
          page = Jekyll::PageWithoutAFile.new(site, site.source, path.delete_prefix("/"), "index.html")
          page.content = root.content
          page.data.merge!(root.data).merge!(CatalogPagination.data(articles, base, number))
          page.data.merge!("permalink" => path, "translation_key" => "catalog-page-#{number}")
          site.pages << page
        end
      end
    end
  end
end
