# frozen_string_literal: true

require "json"

module HistoryMath
  class ArticlePdfIndex < Jekyll::Generator
    safe false
    priority :lowest

    def generate(site)
      records = site.collections.fetch("articles").docs.map do |doc|
        # Drafts are already removed unless this is an explicit review build.
        slug = doc.data.fetch("permalink").split("/").last
        language = doc.data.fetch("lang")
        raise Jekyll::Errors::FatalException, "Invalid PDF identity" unless slug.match?(/\A[a-z0-9-]+\z/) && %w[ru en].include?(language)
        doc.data["pdf_url"] = "/assets/pdf/#{language}/#{slug}.pdf"
        {"url" => doc.url, "pdf_url" => doc.data["pdf_url"], "lang" => language, "title" => doc.data["title"]}
      end
      manifest = Jekyll::PageWithoutAFile.new(site, site.source, "assets", "article-pdfs.json")
      manifest.content = JSON.generate({"version" => 1, "baseurl" => site.baseurl, "origin" => site.config["url"], "articles" => records})
      manifest.data["layout"] = nil
      manifest.data["sitemap"] = false
      manifest.data["render_with_liquid"] = false
      site.pages << manifest
    end
  end
end
