# frozen_string_literal: true

require "json"

module HistoryMath
  def self.article_pdf_path(path, language)
    match = path.is_a?(String) && path.match(%r{\A/(ru/)?(?:articles|publications)/([a-z0-9-]+)/\z})
    valid = match && %w[ru en].include?(language) && (match[1] ? "ru" : "en") == language
    valid = false if valid && match[2].match?(/-(?:ru|en)-(?:ru|en)\z/)
    if valid && match[2].match?(/\Ahm-(?:tt-)?[0-9a-f]{12}-(?:ru|en)\z/)
      valid = match[2].end_with?("-#{language}")
    end
    raise Jekyll::Errors::FatalException, "Invalid PDF identity" unless valid
    slug = match[2].end_with?("-#{language}") ? match[2] : "#{match[2]}-#{language}"
    "/assets/pdf/#{language}/#{slug}.pdf"
  end

  class ArticlePdfIndex < Jekyll::Generator
    safe false
    priority :lowest

    def generate(site)
      records = site.collections.fetch("articles").docs.map do |doc|
        # Drafts are already removed unless this is an explicit review build.
        language = doc.data.fetch("lang")
        doc.data["pdf_url"] = HistoryMath.article_pdf_path(doc.url, language)
        {"url" => doc.url, "pdf_url" => doc.data["pdf_url"], "lang" => language, "title" => doc.data["title"]}
      end
      manifest = Jekyll::PageWithoutAFile.new(site, site.source, "assets", "article-pdfs.json")
      manifest.content = JSON.generate({"version" => 2, "baseurl" => site.baseurl, "origin" => site.config["url"], "articles" => records})
      manifest.data["layout"] = nil
      manifest.data["sitemap"] = false
      manifest.data["render_with_liquid"] = false
      site.pages << manifest
    end
  end
end
