# frozen_string_literal: true

module HistoryMath
  class JournalSections < Jekyll::Generator
    safe false
    priority :normal

    def generate(site)
      # Notices are discoverable summaries, never translated full-text articles.
      documents = site.collections.fetch("articles").docs + site.pages.select { |page| page.data["translation_notice"] }
      site.data["discovery_documents"] = {}
      %w[ru en].each do |language|
        articles = documents.select { |doc| doc.data["lang"] == language && HistoryMath::PUBLIC_STATUSES.include?(doc.data["status"]) }
          .sort_by { |doc| [doc.data["date"], doc.url] }.reverse
        site.data["discovery_documents"][language] = articles
        home = site.pages.find { |page| page.data["translation_key"] == "home" && page.data["lang"] == language }
        next unless home
        published = articles.select { |doc| doc.data["status"] == "published" }
        remainder = published.drop(10)
        quarter = (remainder.length / 4.0).ceil
        home.data.merge!({"journal_articles" => published.take(10), "journal_featured" => remainder.take(quarter),
          "journal_archive" => remainder.drop(quarter)})
      end
    end
  end
end
