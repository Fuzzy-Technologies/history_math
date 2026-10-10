# frozen_string_literal: true

module HistoryMath
  # Derive public routes without rewriting approved editorial packages.
  def self.article_url(path, language)
    path.sub(%r{/(hm-[0-9a-f]{12})(?:-ru|-en)?/\z}, "/\\1-#{language}/")
  end

  def self.localize_article_urls!(site)
    site.collections.fetch("articles").docs.each do |doc|
      path = doc.data.fetch("permalink")
      doc.data["permalink"] = article_url(path, doc.data.fetch("lang"))
    end
  end

  class ArticleRedirects < Jekyll::Generator
    safe false
    priority :lowest

    def generate(site)
      documents = HistoryMath.visible_documents(site).dup
      documents.each do |doc|
        next unless PUBLIC_STATUSES.include?(doc.data["status"])
        next unless doc.url.match?(%r{\A/(?:ru/)?articles/hm-[0-9a-f]{12}-(?:ru|en)/\z})
        legacy = doc.url.sub(/-(?:ru|en)\/$/, "/")
        if HistoryMath.visible_documents(site).any? { |page| page.url == legacy }
          raise Jekyll::Errors::FatalException, "Legacy article URL collision: #{legacy}"
        end
        page = Jekyll::PageWithoutAFile.new(site, site.source, legacy.delete_prefix("/"), "index.html")
        page.data.merge!({"layout" => "article-redirect", "lang" => doc.data.fetch("lang"),
          "redirect_target" => doc.url, "sitemap" => false, "render_with_liquid" => true})
        site.pages << page
      end
    end
  end
end
