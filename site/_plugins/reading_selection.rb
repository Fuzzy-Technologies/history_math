# frozen_string_literal: true

require_relative "topics"

module HistoryMath
  module ReadingSelection
    # Keep the no-JavaScript selection deterministic and use the same windows and quotas as the browser.
    def self.groups(articles, rules, excluded: [])
      ordered = articles.uniq(&:url).sort_by { |article| [article.data["date"], article.url] }.reverse
      published = ordered.reject { |article| article.data["translation_notice"] }
      recent = published.take((published.length + 1) / 2)
      rubric_tags = rules.fetch("rubric_tags").transform_values { |tags| tags.map { |tag| Topics.key(tag) } }
      buckets = recent.reject { |article| excluded.include?(article.url) }.group_by do |article|
        tags = Array(article.data["tags"]).map { |tag| Topics.key(tag) }
        rubric = rubric_tags.find { |_, keys| !(keys & tags).empty? }
        rubric ? rubric.first : (article.data["type"] == "instrument" ? "instruments" : "other")
      end
      reading = rules.fetch("group_limits").flat_map { |group, limit| buckets.fetch(group, []).take(limit) }
        .sort_by { |article| [article.data["date"], article.url] }.reverse
      urls = reading.map(&:url)
      {"reading" => reading, "archive" => ordered.reject { |article| urls.include?(article.url) }}
    end
  end
end
