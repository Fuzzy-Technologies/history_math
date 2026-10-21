# frozen_string_literal: true

require_relative "topics"
require_relative "reading_selection"

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
        excluded_tags = site.data.fetch("home_rubrics").flat_map { |rubric| %w[ru en].flat_map { |locale| rubric.fetch(locale).fetch("tags") } }.uniq
        groups = ReadingSelection.groups(published, site.data.fetch("reading_selection"))
        rubrics = site.data.fetch("home_rubrics").map do |rubric|
          localized = rubric.fetch(language)
          localized.merge("id" => rubric.fetch("id"), "articles" => Topics.rubric_articles(published, localized.fetch("tags")))
        end
        home.data.merge!({"journal_articles" => groups.fetch("reading"), "journal_rubrics" => rubrics,
          "journal_article_picks" => Topics.article_candidates(published, excluded_tags), "journal_excluded_tags" => excluded_tags,
          "journal_archive" => groups.fetch("archive")})
      end
    end
  end
end
