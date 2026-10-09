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
  Dir.glob("tests/fixtures/articles/*.md").each { |file| FileUtils.cp(file, File.join(source, "_articles")) }
  46.times do |index|
    id = "fixture-#{index.to_s.rjust(3, '0')}"
    data = YAML.safe_load(File.read("templates/minimal-article.md").split("---", 3)[1])
    data.merge!({"article_id" => id, "source_work_id" => id, "translation_key" => id,
      "title" => "Проверка подборок #{index}", "author" => "Test fixture", "authors" => ["Test fixture"],
      "lang" => "ru", "status" => "published", "date" => "2020-01-01", "tags" => ["fixture"],
      "permalink" => "/ru/articles/#{id}/",
      "preview_image" => "/assets/images/example/triangle.svg",
      "figures" => [{"id" => "fig-1", "path" => "/assets/images/example/triangle.svg",
        "alt" => "Test triangle", "caption" => "", "credit" => "",
        "source" => "Repository test illustration", "rights_basis" => "Test-only fixture"}]})
    text = YAML.dump(data) + "---\n\nTest-only pagination and archive fixture.\n"
    File.write(File.join(source, "_articles/#{id}.md"), text)
    digest = Digest::SHA256.new.update(text)
    digest.update("\0/assets/images/example/triangle.svg\0").update(File.binread("site/assets/images/example/triangle.svg"))
    File.write(File.join(root, "reviews/#{id}.json"), JSON.generate({"article_id" => id, "review_version" => 1,
      "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Test editor",
      "date" => "2026-10-09", "package_sha256" => digest.hexdigest}}))
  end
  config = Jekyll.configuration("config" => File.expand_path("_config.yml"), "source" => source,
    "destination" => File.expand_path("test-results/browser-fixture"), "quiet" => true)
  Jekyll::Site.new(config).process
end
