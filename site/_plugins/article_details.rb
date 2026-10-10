# frozen_string_literal: true

require "date"

module HistoryMath
  module CitationFilters
    IEEE_MONTHS = %w[Jan. Feb. Mar. Apr. May Jun. Jul. Aug. Sep. Oct. Nov. Dec.].freeze

    def ieee_date(value)
      date = value.respond_to?(:strftime) ? value : Date.iso8601(value.to_s)
      "#{IEEE_MONTHS[date.month - 1]} #{date.day}, #{date.year}"
    end

    # A curated registry keeps surname order and initials explicit; never guess them.
    def citation_authors(authors, language)
      registry = @context.registers[:site].data.fetch("citation_authors", {})
      names = Array(authors).map { |name| registry.dig(name, language) || name }
      return names.join(", ") if language == "ru" || names.length < 2
      return "#{names.first} et al." if names.length > 6
      return names.join(" and ") if names.length == 2
      "#{names[0...-1].join(', ')}, and #{names.last}"
    end
  end
end
Liquid::Template.register_filter(HistoryMath::CitationFilters)
