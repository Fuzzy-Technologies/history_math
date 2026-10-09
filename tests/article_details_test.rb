# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require "tmpdir"
require "fileutils"
require "json"
require "digest"
require "yaml"

class ArticleDetailsTest < Minitest::Test
  def with_site
    Dir.mktmpdir("history-math-details") do |root|
      source = File.join(root, "site")
      FileUtils.cp_r(File.expand_path("../site", __dir__), source)
      FileUtils.cp_r(File.expand_path("../schemas", __dir__), File.join(root, "schemas"))
      config = Jekyll.configuration("config" => File.expand_path("../_config.yml", __dir__),
        "source" => source, "destination" => File.join(root, "output"), "quiet" => true)
      yield source, config
    end
  end
  def test_real_dates_author_forms_and_safe_draft_details
    with_site do |source, config|
      reviews = File.expand_path("../reviews", source)
      FileUtils.mkdir_p(reviews)
      %w[ru en].each do |language|
        data = YAML.safe_load(File.read(File.expand_path("../templates/minimal-article.md", __dir__)).split("---", 3)[1])
        id = "citation-#{language}"
        data.merge!({"article_id" => id, "source_work_id" => id, "translation_key" => id, "status" => "published",
          "date" => "2026-10-09", "updated" => "2026-10-10", "lang" => language,
          "title" => language == "ru" ? "Матрицы и окружности" : "Matrices and circles",
          "author" => language == "ru" ? "Мансур Гильмуллин" : "Mansur Gilmullin",
          "authors" => [language == "ru" ? "Мансур Гильмуллин" : "Mansur Gilmullin"],
          "permalink" => "/#{language == 'ru' ? 'ru/' : ''}articles/#{id}/",
          "original_publication" => {"outlet" => "Telegram", "date" => "2023-08-23"}})
        text = YAML.dump(data) + "---\n\nA short fixture article.\n"
        File.write(File.join(source, "_articles/#{id}.md"), text)
        File.write(File.join(reviews, "#{id}.json"), JSON.generate({"article_id" => id, "review_version" => 1,
          "questions" => [], "approval" => {"status" => "approved", "reviewed_by" => "Test editor",
          "date" => "2026-10-09", "package_sha256" => Digest::SHA256.hexdigest(text)}}))
      end
      site = Jekyll::Site.new(config)
      site.process
      ru = File.read(File.join(site.dest, "ru/articles/citation-ru/index.html"))
      en = File.read(File.join(site.dest, "articles/citation-en/index.html"))
      assert_includes ru, "Гильмуллин, М. Ф. Матрицы и окружности //"
      assert_includes ru, "Дата публикации: 09.10.2026."
      assert_includes ru, "Дата обновления: 10.10.2026."
      assert_includes ru, "23.08.2023"
      assert_includes en, "Gilmullin, M. F. (2026, October 10). <em>Matrices and circles</em>."
      refute_includes en, "data-citation-access"
      refute_match(/ISSN|DOI|Vol\./, ru + en)
      demo = File.read(File.join(site.dest, "ru/articles/demo-geometry/index.html"))
      refute_includes demo, "data-article-citation"
      destination = File.expand_path("../test-results/details-fixture", __dir__)
      FileUtils.rm_rf(destination)
      FileUtils.cp_r(site.dest, destination)
    end
  end
end
