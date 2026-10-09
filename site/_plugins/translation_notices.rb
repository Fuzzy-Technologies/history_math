# frozen_string_literal: true

module HistoryMath
  class TranslationNotices < Jekyll::Generator
    safe false
    priority :normal

    def generate(site)
      articles = site.collections.fetch("articles").docs
      site.data.fetch("english_notices", {}).each do |id, text|
        original = articles.find { |doc| doc.data["article_id"] == id && doc.data["lang"] == "ru" }
        next unless original
        # A real translation replaces the notice and owns the same public URL.
        next if articles.any? { |doc| doc.data["translation_key"] == original.data["translation_key"] && doc.data["lang"] == "en" }
        url = original.url.delete_prefix("/ru")
        if HistoryMath.visible_documents(site).any? { |document| document.url == url }
          raise Jekyll::Errors::FatalException, "English notice conflicts with an existing URL: #{url}"
        end
        page = Jekyll::PageWithoutAFile.new(site, site.source, url.delete_prefix("/"), "index.html")
        page.data.merge!({"layout" => "translation-notice", "title" => text.fetch("title"),
          "description" => text.fetch("description"), "lang" => "en", "status" => original.data["status"],
          "permalink" => url, "original_url" => original.url, "translation_notice" => true,
          "sitemap" => false, "noindex" => true})
        # The notice is not a translated article: no translation_key, hreflang or article index record.
        original.data["english_notice_url"] = url
        site.pages << page
      end
    end
  end
end
