# frozen_string_literal: true

require "json"
require "cgi"
require "date"

module HistoryMath
  PUBLIC_STATUSES = %w[published demo].freeze
  ARTICLE_FIELDS = %w[layout title lang translation_key date type author description tags math status permalink].freeze
  TYPES = %w[essay problem instrument note].freeze

  def self.validate_article!(document)
    data = document.data
    missing = ARTICLE_FIELDS.reject { |field| data.key?(field) }
    raise Jekyll::Errors::FatalException, "#{document.path}: missing #{missing.join(', ')}" unless missing.empty?
    valid = data["layout"] == "article" && %w[en ru].include?(data["lang"]) &&
      TYPES.include?(data["type"]) && [true, false].include?(data["math"]) &&
      data["tags"].is_a?(Array) && data["tags"].all? { |tag| tag.is_a?(String) && !tag.strip.empty? } &&
      %w[title translation_key author description].all? { |key| data[key].is_a?(String) && !data[key].strip.empty? } &&
      data["translation_key"].match?(/\A[a-z0-9][a-z0-9-]*\z/) &&
      data["permalink"].is_a?(String) && data["permalink"].match?(/\A\/(ru\/)?articles\/[a-z0-9-]+\/\z/)
    valid &&= data["lang"] == "ru" ? data["permalink"].start_with?("/ru/") : !data["permalink"].start_with?("/ru/")
    raise Jekyll::Errors::FatalException, "#{document.path}: invalid public article contract" unless valid
    Date.iso8601(data["date"].strftime("%Y-%m-%d"))
    if data["hero_image"] && (!data["hero_alt"].is_a?(String) || data["hero_alt"].strip.empty?)
      raise Jekyll::Errors::FatalException, "#{document.path}: hero_alt is required for hero_image"
    end
    %w[preview_image cover_image hero_image].each do |key|
      next unless data[key]
      path = data[key]
      valid_asset = path.is_a?(String) && path.start_with?("/assets/") && !path.include?("..") &&
        File.file?(File.join(document.site.source, path.delete_prefix("/")))
      raise Jekyll::Errors::FatalException, "#{document.path}: invalid #{key}" unless valid_asset
    end
    if data["source_work_id"] && !data["source_work_id"].match?(/\A[a-zA-Z0-9_-]{1,80}\z/)
      raise Jekyll::Errors::FatalException, "#{document.path}: unsafe public source_work_id"
    end
  rescue ArgumentError, NoMethodError
    raise Jekyll::Errors::FatalException, "#{document.path}: invalid publication date or metadata"
  end

  def self.visible_documents(site)
    site.pages + site.collections.fetch("articles").docs
  end

  class PublicIndex < Jekyll::Generator
    safe false
    priority :low

    def generate(site)
      documents = HistoryMath.visible_documents(site)
      groups = documents.select { |doc| doc.data["translation_key"] }.group_by { |doc| doc.data["translation_key"] }
      groups.each_value do |group|
        languages = group.map { |doc| doc.data["lang"] }
        raise Jekyll::Errors::FatalException, "Duplicate translation language" unless languages.uniq == languages
        group.each do |doc|
          doc.data["translations"] = group.map { |translation| {"lang" => translation.data["lang"], "url" => translation.url} }
        end
      end
      articles = site.collections.fetch("articles").docs.sort_by { |doc| doc.data["date"] }.reverse
      %w[en ru].each do |language|
        records = articles.select { |doc| doc.data["lang"] == language }.map do |doc|
          body = doc.content.gsub(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/, " ")
          html = site.find_converter_instance(Jekyll::Converters::Markdown).convert(body)
          text = CGI.unescapeHTML(html.gsub(/<[^>]*>/, " ")).gsub(/\s+/, " ").strip
          {title: doc.data["title"], description: doc.data["description"], tags: doc.data["tags"],
           type: doc.data["type"], language: language, date: doc.data["date"].strftime("%Y-%m-%d"),
           url: site.baseurl + doc.url, text: text, status: doc.data["status"], preview_image: doc.data["preview_image"] && site.baseurl + doc.data["preview_image"]}
        end
        page = Jekyll::PageWithoutAFile.new(site, site.source, "assets", "search-#{language}.json")
        page.content = JSON.generate(records)
        page.data["layout"] = nil
        page.data["sitemap"] = false
        page.data["render_with_liquid"] = false
        site.pages << page
      end
      urls = documents.select { |doc| doc.data["sitemap"] != false && doc.data["layout"] }.map do |doc|
        "<url><loc>#{CGI.escapeHTML(site.config['url'] + site.baseurl + doc.url)}</loc></url>"
      end
      sitemap = Jekyll::PageWithoutAFile.new(site, site.source, "", "sitemap.xml")
      sitemap.content = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join + '</urlset>'
      sitemap.data["layout"] = nil
      sitemap.data["render_with_liquid"] = false
      site.pages << sitemap
    end
  end
end

# Remove non-public documents before rendering or index discovery, including their direct URLs.
Jekyll::Hooks.register :site, :post_read do |site|
  site.collections.fetch("articles").docs.select! { |doc| HistoryMath::PUBLIC_STATUSES.include?(doc.data["status"]) }
  site.collections.fetch("articles").docs.each { |doc| HistoryMath.validate_article!(doc) }
  site.pages.select! { |page| HistoryMath::PUBLIC_STATUSES.include?(page.data["status"]) }
  site.static_files.select! { |file| file.relative_path.start_with?("/assets/") }
  urls = HistoryMath.visible_documents(site).map(&:url)
  raise Jekyll::Errors::FatalException, "Duplicate public URL" unless urls.uniq == urls
end

# Protect literal dollar math from Markdown emphasis and preserve display math before conversion.
Jekyll::Hooks.register :documents, :pre_render do |document|
  next unless document.data["math"] == true
  pieces = document.content.split(/(```[\s\S]*?```|`[^`\n]+`)/)
  document.content = pieces.map.with_index do |piece, index|
    next piece if index.odd?
    piece.gsub(/\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?!\$)([^\n$]+?)\$(?!\$)/) do
      display = !Regexp.last_match(1).nil?
      tex = Regexp.last_match(1) || Regexp.last_match(2)
      tag = display ? "div" : "span"
      "<#{tag} class=\"math-source\" data-display=\"#{display}\" data-tex=\"#{CGI.escapeHTML(tex.strip)}\">#{CGI.escapeHTML(tex.strip)}</#{tag}>"
    end
  end.join
end
