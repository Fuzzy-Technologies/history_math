# frozen_string_literal: true

require "json"
require "open3"
require "time"
require "date"
require "uri"

module HistoryMath
  # Explicit owner-authorized corrections may retain another outlet's date.
  def self.preserved_publication_date(data)
    original = data["original_publication"]
    return unless original.is_a?(Hash) && original["preserve_date"] == true

    date = Date.iso8601(original.fetch("date")).to_s
    raise Date::Error unless date == original["date"]
    date
  rescue KeyError, TypeError, Date::Error
    raise Jekyll::Errors::FatalException, "Invalid preserved original publication date"
  end

  # The owner-authorized Teletype migration preserves its visible outlet date.
  # Other publications keep master merge dates unless explicitly opted in above.
  def self.teletype_publication_date(data)
    original = data["original_publication"]
    return unless original.is_a?(Hash) && original["outlet"] == "Teletype"
    return unless original["date"] && original["url"] == data["source_url"]
    uri = URI.parse(original["url"].to_s)
    return unless uri.scheme == "https" && uri.host == "teletype.in" &&
      uri.path.match?(%r{\A/@history_math/[^/]+\z}) && !uri.userinfo && !uri.query && !uri.fragment
    Date.iso8601(original["date"]).to_s
  rescue URI::InvalidURIError, Date::Error
    raise Jekyll::Errors::FatalException, "Invalid Teletype migration publication metadata"
  end

  def self.apply_publication_dates!(site)
    root = File.expand_path("..", site.source)
    strict = ENV["HISTORY_MATH_PUBLICATION_STRICT"] == "1"
    registry = {}
    # Standalone preview/test fixtures have no Git checkout. Production is strict.
    if strict || File.exist?(File.join(root, ".git"))
      ref = ENV.fetch("HISTORY_MATH_PUBLICATION_REF", "refs/remotes/origin/master")
      output, error, status = Open3.capture3("node", File.join(root, "scripts/publication-dates.mjs"), root, ref)
      raise Jekyll::Errors::FatalException, error unless status.success?
      registry = JSON.parse(output).fetch("articles")
    end
    site.collections.fetch("articles").docs.each do |doc|
      next unless doc.data["status"] == "published"
      original_date = preserved_publication_date(doc.data) || teletype_publication_date(doc.data)
      if original_date
        doc.data["date"] = Time.iso8601("#{original_date}T00:00:00+03:00")
        next
      end
      entry = registry["#{doc.data['article_id']}:#{doc.data['lang']}"]
      if entry
        doc.data["date"] = Time.iso8601("#{entry.fetch('date')}T00:00:00+03:00")
      elsif strict
        raise Jekyll::Errors::FatalException, "#{doc.path}: no publication in master history"
      else
        doc.data["date"] ||= site.time
      end
    end
  end
end
