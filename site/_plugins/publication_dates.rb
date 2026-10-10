# frozen_string_literal: true

require "json"
require "open3"
require "time"

module HistoryMath
  def self.apply_publication_dates!(site)
    root = File.expand_path("..", site.source)
    strict = ENV["HISTORY_MATH_PUBLICATION_STRICT"] == "1"
    # Standalone preview/test fixtures have no Git checkout. Production is strict.
    return unless strict || File.exist?(File.join(root, ".git"))

    ref = ENV.fetch("HISTORY_MATH_PUBLICATION_REF", "refs/remotes/origin/master")
    output, error, status = Open3.capture3("node", File.join(root, "scripts/publication-dates.mjs"), root, ref)
    raise Jekyll::Errors::FatalException, error unless status.success?
    registry = JSON.parse(output).fetch("articles")
    site.collections.fetch("articles").docs.each do |doc|
      next unless doc.data["status"] == "published"
      entry = registry["#{doc.data['article_id']}:#{doc.data['lang']}"]
      if entry
        doc.data["date"] = Time.iso8601("#{entry.fetch('date')}T00:00:00+03:00")
      elsif strict
        raise Jekyll::Errors::FatalException, "#{doc.path}: no publication in master history"
      end
    end
  end
end
