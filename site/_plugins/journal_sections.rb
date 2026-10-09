# frozen_string_literal: true

module HistoryMath
  class JournalSections < Jekyll::Generator
    safe false
    priority :normal

    def generate(site)
      home = site.pages.find { |page| page.url == "/ru/" }
      return unless home
      articles = site.collections.fetch("articles").docs
        .select { |doc| doc.data["lang"] == "ru" && doc.data["status"] == "published" }
        .sort_by { |doc| [doc.data["date"], doc.url] }.reverse
      remainder = articles.drop(10)
      midpoint = (remainder.length / 2.0).ceil
      pages = [(articles.length / 10.0).ceil, 1].max
      home.data.merge!({"journal_articles" => articles, "journal_featured" => remainder.take(midpoint),
        "journal_archive" => remainder.drop(midpoint), "article_page" => 1, "article_pages" => pages})
      (2..pages).each do |number|
        page = Jekyll::PageWithoutAFile.new(site, site.source, "ru/page/#{number}", "index.html")
        page.content = home.content
        page.data = home.data.dup
        page.data.delete("translation_key")
        page.data.delete("translations")
        page.data.merge!({"permalink" => "/ru/page/#{number}/", "article_page" => number,
          "title" => "Материалы — страница #{number}"})
        site.pages << page
      end
    end
  end
end
