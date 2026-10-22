# frozen_string_literal: true

require "jekyll"
require "tmpdir"
require "fileutils"
require "yaml"
require "json"
require "digest"

# Legacy reading scenarios stay test-only after retiring the public demos.
Dir.mktmpdir("history-math-browser") do |root|
  source = File.join(root, "site")
  FileUtils.cp_r("site", source)
  FileUtils.cp_r("schemas", File.join(root, "schemas"))
  FileUtils.cp_r("reviews", File.join(root, "reviews"))
  # Keep the legacy reading/grouping fixture independent of new production articles.
  fixture_keys = JSON.parse(File.read("site/_data/english_notices.json")).keys
  Dir.glob(File.join(source, "_articles/hm-*.md")).each do |path|
    File.delete(path) unless fixture_keys.include?(File.basename(path).sub(/-(?:ru|en)\.md\z/, ""))
  end
  Dir.glob("tests/fixtures/articles/*.md").each { |file| FileUtils.cp(file, File.join(source, "_articles")) }
  %w[ru en].each do |language|
    46.times do |index|
      id = "fixture-#{language}-#{index.to_s.rjust(3, '0')}"
      data = YAML.safe_load(File.read("templates/minimal-article.md").split("---", 3)[1])
      data.merge!({"article_id" => id, "source_work_id" => id, "translation_key" => id,
        "title" => language == "ru" ? "Проверка подборок #{index}" : "Archive selection #{index}", "author" => "Test fixture", "authors" => ["Test fixture"],
        "lang" => language, "status" => "published", "date" => "2020-01-01",
        "tags" => ["fixture", language == "en" ? (index.even? ? "history_of_mathematics" : "History of mathematics") : "история", index.even? ? (language == "ru" ? "персоналии" : "People") :
          (language == "ru" ? ["Математики шутят", "анекдоты", "Цитаты"][index % 3] : ["Jokes", "Anecdotes", "Quotes"][index % 3])],
        "permalink" => "#{language == 'ru' ? '/ru' : ''}/articles/#{id}/",
        "preview_image" => "/assets/images/example/triangle.svg",
        "figures" => [{"id" => "fig-1", "path" => "/assets/images/example/triangle.svg",
          "alt" => "Test triangle", "caption" => "", "credit" => "",
          "source" => "Repository test illustration", "rights_basis" => "Test-only fixture"}]})
      if index >= 19
        data["tags"] << (language == "ru" ? "Глоссарий" : "Glossary")
        data["series"] = language == "ru" ? "Глоссарий" : "Glossary" if index.even?
      end
      text = YAML.dump(data) + "---\n\nTest-only bilingual discovery fixture.\n"
      File.write(File.join(source, "_articles/#{id}.md"), text)
      digest = Digest::SHA256.new.update(text)
      digest.update("\0/assets/images/example/triangle.svg\0").update(File.binread("site/assets/images/example/triangle.svg"))
      File.write(File.join(root, "reviews/#{id}.json"), JSON.generate({"article_id" => id, "review_version" => 1,
        "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Test editor",
        "date" => "2026-10-09", "package_sha256" => digest.hexdigest}}))
    end
  end
  config = Jekyll.configuration("config" => File.expand_path("_config.yml"), "source" => source,
    "destination" => File.expand_path("test-results/browser-fixture"), "quiet" => true)
  Jekyll::Site.new(config).process
end
