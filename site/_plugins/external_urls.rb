# frozen_string_literal: true

require "addressable/uri"

module HistoryMath
  module ExternalUrls
    # Only verified locale routes are rewritten. Preserve the referenced resource.
    def external_url(value, language)
      language = language == "ru" ? "ru" : "en"
      uri = Addressable::URI.parse(value.to_s)
      return value unless %w[http https].include?(uri.scheme)

      parameter = nil
      case uri.host
      when "fuzzy-technologies.github.io"
        return value unless ["", "/", "/ru/"].include?(uri.path)
        uri.path = language == "ru" ? "/ru/" : "/"
      when "history-math.blogspot.com"
        parameter = "hl"
      when "commons.wikimedia.org"
        return value unless uri.path.start_with?("/wiki/")
        parameter = "uselang"
      when "creativecommons.org"
        match = %r{\A(/licenses/[^/]+/\d+(?:\.\d+)?/)(?:deed(?:\.[a-z-]+)?)?\z}.match(uri.path)
        return value unless match
        uri.path = "#{match[1]}deed.#{language}"
      else
        return value
      end
      if parameter
        query = uri.query_values(Array) || []
        query.reject! { |key, _| key == parameter }
        uri.query_values = query + [[parameter, language]]
      end
      uri.to_s
    rescue Addressable::URI::InvalidURIError
      value
    end
  end
end

Liquid::Template.register_filter(HistoryMath::ExternalUrls)
