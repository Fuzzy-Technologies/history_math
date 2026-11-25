# frozen_string_literal: true

require "addressable/uri"
require "cgi"

module HistoryMath
  module ExternalUrls
    # Keep all rendered HTML byte-for-byte except link destinations the existing
    # language policy recognizes. Quoted attributes, comments and raw text can
    # contain tag-shaped examples of their own.
    TAG_CONTENT = /(?:[^"'<>]++|"[^"]*"|'[^']*')*/
    HTML_TOKEN = %r{<!--.*?-->|<(?<raw>script|style|textarea|title)\b#{TAG_CONTENT}>.*?</\k<raw>\s*>|<[a-z][\w:-]*\b#{TAG_CONTENT}>}im
    ATTRIBUTE = /(\s+)([^\s=\/>]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/

    def article_link_languages(markup, language)
      markup.gsub(HTML_TOKEN) do |tag|
        next tag unless tag.match?(/\A<a[\s>]/i)
        tag.gsub(ATTRIBUTE) do |attribute|
          space, name, equals, double, single, bare = Regexp.last_match.captures
          next attribute unless name.casecmp?("href")
          original = CGI.unescapeHTML(double || single || bare)
          localized = external_url(original, language)
          next attribute if localized == original
          quote = single ? "'" : '"'
          "#{space}#{name}#{equals}#{quote}#{CGI.escapeHTML(localized)}#{quote}"
        end
      end
    end

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
