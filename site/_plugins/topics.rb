# frozen_string_literal: true

require "json"

module HistoryMath
  module Topics
    def self.key(value)
      value.to_s.unicode_normalize(:nfkc).downcase.tr("ё", "е").gsub(/[_\s]+/, " ").strip
    end

    LABELS = JSON.parse(File.read(File.expand_path("../_data/topics.json", __dir__))).to_h { |label| [key(label), label] }.freeze

    # Project navigation labels without changing approved article metadata.
    def self.labels(values)
      Array(values).map { |value| LABELS.fetch(key(value), value) }.uniq { |value| key(value) }
    end

    def self.rubric_articles(articles, tags)
      keys = tags.map { |tag| key(tag) }
      articles.select do |article|
        article.data["status"] == "published" && !article.data["translation_notice"] &&
          Array(article.data["tags"]).any? { |tag| keys.include?(key(tag)) }
      end
    end

    def self.article_candidates(articles, excluded_tags)
      keys = excluded_tags.map { |tag| key(tag) }
      articles.select do |article|
        article.data["status"] == "published" && !article.data["translation_notice"] &&
          Array(article.data["tags"]).none? { |tag| keys.include?(key(tag)) }
      end
    end
  end

  module TopicFilters
    def topic_label(value)
      Topics.labels([value]).first
    end

    def topic_labels(values)
      Topics.labels(values)
    end

    def article_rubric_title(tags, rubrics, language)
      locale = language == "ru" ? "ru" : "en"
      article_keys = Array(tags).map { |tag| Topics.key(tag) }
      rubrics.each do |rubric|
        localized = rubric.fetch(locale)
        rubric_tags = localized.fetch("tags") + localized.fetch("article_tags", [])
        if rubric_tags.any? { |tag| article_keys.include?(Topics.key(tag)) }
          return localized.fetch("article_title") { localized.fetch("title") }
        end
      end
      nil
    end
  end
end

Liquid::Template.register_filter(HistoryMath::TopicFilters)
