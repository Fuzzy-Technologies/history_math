# frozen_string_literal: true

module HistoryMath
  module CitationFilters
    # A curated registry keeps surname order and initials explicit; never guess them.
    def citation_authors(authors, language)
      registry = @context.registers[:site].data.fetch("citation_authors", {})
      names = Array(authors).map { |name| registry.dig(name, language) || name }
      return names.join(", ") if language == "ru" || names.length < 2
      return "#{names.first(19).join(', ')}, … #{names.last}" if names.length > 20
      return names.join(" & ") if names.length == 2
      "#{names[0...-1].join(', ')}, & #{names.last}"
    end
  end
end
Liquid::Template.register_filter(HistoryMath::CitationFilters)
