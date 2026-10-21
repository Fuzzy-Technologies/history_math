# frozen_string_literal: true

require_relative "topics"

module HistoryMath
  module ReadingSelection
    def self.series_key(article, rules)
      explicit = Topics.key(article.data["series"])
      keys = Array(article.data["tags"]).map { |tag| Topics.key(tag) } + [explicit]
      group = rules.fetch("series_tags").find { |entry| entry.fetch("tags").any? { |tag| keys.include?(Topics.key(tag)) } }
      group ? group.fetch("id") : explicit
    end

    # A deterministic, balanced fallback keeps navigation useful without JavaScript.
    def self.groups(articles, rules)
      ordered = articles.uniq(&:url).sort_by { |article| [article.data["date"], article.url] }.reverse
      counts = Hash.new(0)
      selected = []
      overflow = []
      ordered.take(rules.fetch("pool_size")).each do |article|
        key = series_key(article, rules)
        if key.empty? || counts[key] < rules.fetch("series_limit")
          selected << article
          counts[key] += 1
        else
          overflow << article
        end
      end
      reading = (selected + overflow).take(rules.fetch("card_count"))
        .sort_by { |article| [article.data["date"], article.url] }.reverse
      urls = reading.map(&:url)
      {"reading" => reading, "archive" => ordered.reject { |article| urls.include?(article.url) }}
    end
  end
end
