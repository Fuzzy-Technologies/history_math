# frozen_string_literal: true

require_relative "topics"

module HistoryMath
  # Navigation categories are derived at build time without changing editorial metadata.
  class CatalogTypes
    LONGREAD_WORDS = 1_000
    INSTRUMENT_TAGS = %w[instruments инструменты].freeze

    def initialize(rubrics)
      people = rubrics.find { |rubric| rubric.fetch("id") == "people" }
      @people_tags = %w[ru en].flat_map { |locale| people.fetch(locale).fetch("tags") }.map { |tag| Topics.key(tag) }
      @originals = {}
    end

    # The index processes Russian originals before English translations and notices.
    def for_document(document, text)
      data = document.data
      if data["lang"] == "ru"
        return @originals[document.url] = classify(data, text)
      end

      original = data["original_url"] || Array(data["translations"]).find { |item| item["lang"] == "ru" }&.fetch("url")
      @originals.fetch(original) { classify(data, text) }
    end

    private

    def classify(data, text)
      return data["type"] unless data["type"] == "essay"

      markers = (Array(data["tags"]) + [data["series"]]).map { |value| Topics.key(value) }
      return "people" if markers.intersect?(@people_tags)
      return "instrument" if markers.intersect?(INSTRUMENT_TAGS)

      text.scan(/[[:alpha:]]+(?:[-’'][[:alpha:]]+)*/).size >= LONGREAD_WORDS ? "longread" : "short-essay"
    end
  end
end
