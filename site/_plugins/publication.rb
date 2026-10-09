# frozen_string_literal: true

require "json"
require "cgi"
require "date"
require "digest"

module HistoryMath
  PUBLIC_STATUSES = %w[published demo].freeze
  ARTICLE_FIELDS = %w[layout title lang translation_key date type author description tags math status permalink].freeze
  TYPES = %w[essay problem instrument note].freeze

  def self.validate_approval!(document)
    return unless document.data["status"] == "published"
    root = File.expand_path("..", document.site.source)
    review = JSON.parse(File.read(File.join(root, "reviews", "#{document.data['article_id']}.json")))
    approval = review.fetch("approval")
    questions = review.fetch("questions")
    valid = review["review_version"] == 1 && review["article_id"] == document.data["article_id"] &&
      !review.key?("editorial_questions") && approval["status"] == "approved" &&
      approval["reviewed_by"].is_a?(String) && !approval["reviewed_by"].strip.empty? &&
      approval["date"].is_a?(String) && Date.iso8601(approval["date"]).to_s == approval["date"] &&
      questions.is_a?(Array) && questions.all? { |q| q.is_a?(Hash) &&
        q["id"].is_a?(String) && !q["id"].strip.empty? &&
        q["question"].is_a?(String) && !q["question"].strip.empty? &&
        [true, false].include?(q["blocking"]) && %w[open resolved accepted].include?(q["state"]) &&
        !(q["blocking"] && q["state"] == "open") &&
        (q["state"] == "open" || (q["resolution"].is_a?(String) && !q["resolution"].strip.empty?)) } &&
      questions.map { |q| q["id"] }.uniq.length == questions.length
    digest = Digest::SHA256.new.update(File.binread(document.path).gsub("\r\n", "\n"))
    paths = (document.data.fetch("figures", []).map { |figure| figure["path"] } +
      %w[preview_image cover_image hero_image].filter_map { |key| document.data[key] }).uniq.sort
    paths.each do |path|
      raise ArgumentError unless path.match?(%r{\A/assets/images/[a-z0-9-]+/[A-Za-z0-9._-]+\z})
      digest.update("\0#{path}\0").update(File.binread(File.join(document.site.source, path.delete_prefix("/"))))
    end
    valid &&= approval["package_sha256"] == digest.hexdigest
    raise ArgumentError unless valid
  rescue StandardError => error
    raise Jekyll::Errors::FatalException, "#{document.path}: publication requires editorial approval for the current text and images (#{error.class})"
  end

  # The source gate uses Ajv; Jekyll interprets the same canonical site schema.
  def self.schema_errors(value, schema, path = "metadata")
    errors = []
    types = {"object" => [Hash], "array" => [Array], "string" => [String], "boolean" => [TrueClass, FalseClass]}
    if schema["type"] && !types.fetch(schema["type"]).any? { |type| value.is_a?(type) }
      return ["#{path}: expected #{schema['type']}"]
    end
    errors << "#{path}: incorrect constant" if schema.key?("const") && value != schema["const"]
    errors << "#{path}: incorrect enum" if schema["enum"] && !schema["enum"].include?(value)
    if value.is_a?(Hash)
      (schema["required"] || []).each { |key| errors << "#{path}.#{key}: required" unless value.key?(key) }
      value.each do |key, item|
        property = (schema["properties"] || {})[key]
        errors.concat(schema_errors(item, property, "#{path}.#{key}")) if property
        errors << "#{path}.#{key}: unknown field" if schema["additionalProperties"] == false && !property
      end
    elsif value.is_a?(Array)
      errors << "#{path}: too few items" if schema["minItems"] && value.length < schema["minItems"]
      errors << "#{path}: duplicate items" if schema["uniqueItems"] && value.uniq != value
      value.each_with_index { |item, index| errors.concat(schema_errors(item, schema["items"], "#{path}[#{index}]")) } if schema["items"]
    elsif value.is_a?(String)
      errors << "#{path}: empty" if schema["minLength"] && value.length < schema["minLength"]
      errors << "#{path}: invalid pattern" if schema["pattern"] && !Regexp.new(schema["pattern"]).match?(value)
    end
    (schema["allOf"] || []).each do |condition|
      errors.concat(schema_errors(value, condition["then"], path)) if schema_errors(value, condition["if"]).empty?
    end
    errors
  end

  def self.validate_article!(document)
    data = document.data
    if data["schema_version"] == 1
      schema = JSON.parse(File.read(File.expand_path("../schemas/article-v1.schema.json", document.site.source)))
      # Jekyll adds date, excerpt and collection data; the source gate rejects unknown author fields.
      public_data = data.select { |key, _| schema["properties"].key?(key) && key != "date" }
      if PUBLIC_STATUSES.include?(data["status"]) && data["date"]
        public_data["date"] = data["date"].strftime("%Y-%m-%d")
      end
      errors = schema_errors(public_data, schema)
      raise Jekyll::Errors::FatalException, "#{document.path}: #{errors.join('; ')}" unless errors.empty?
      HistoryMath.validate_approval!(document)
      return
    end
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
      articles = site.collections.fetch("articles").docs.select { |doc| PUBLIC_STATUSES.include?(doc.data["status"]) }.sort_by { |doc| doc.data["date"] }.reverse
      %w[en ru].each do |language|
        records = articles.select { |doc| doc.data["lang"] == language }.map do |doc|
          body = doc.content.gsub(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/, " ")
          html = site.find_converter_instance(Jekyll::Converters::Markdown).convert(body)
          text = CGI.unescapeHTML(html.gsub(/<[^>]*>/, " ")).gsub(/\s+/, " ").strip
          {title: doc.data["title"], description: doc.data["description"], tags: doc.data["tags"],
           type: doc.data["type"], language: language, date: doc.data["date"].strftime("%Y-%m-%d"),
           url: site.baseurl + doc.url, text: text, status: doc.data["status"], preview_image: doc.data["preview_image"] && site.baseurl + (site.data.fetch("image_assets").dig(doc.data["preview_image"], "variants", 0, "path") || doc.data["preview_image"])}
        end
        page = Jekyll::PageWithoutAFile.new(site, site.source, "assets", "search-#{language}.json")
        page.content = JSON.generate(records)
        page.data["layout"] = nil
        page.data["sitemap"] = false
        page.data["render_with_liquid"] = false
        site.pages << page
      end
      urls = documents.select { |doc| doc.data["sitemap"] != false && doc.data["layout"] && PUBLIC_STATUSES.include?(doc.data["status"]) }.map do |doc|
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
  site.collections.fetch("articles").docs.select! do |doc|
    HistoryMath::PUBLIC_STATUSES.include?(doc.data["status"]) ||
      (site.config["article_review"] == true && doc.data["schema_version"] == 1 && doc.data["status"] == "draft")
  end
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
