# frozen_string_literal: true

require "minitest/autorun"
require "liquid"
require_relative "../site/_plugins/topics"
require_relative "../site/_plugins/reading_selection"

class TopicsTest < Minitest::Test
  Article = Struct.new(:data)

  def test_labels_collapse_case_and_underscores_without_mutating_approved_metadata
    tags = ["History of mathematics", "history_of_mathematics", "Lives_of_Remarkable_People", "персоналии", "geometry"]
    before = tags.map(&:dup)
    assert_equal ["History of Mathematics", "Lives of Remarkable People", "Персоналии", "geometry"], HistoryMath::Topics.labels(tags)
    assert_equal before, tags
    assert_equal "счет", HistoryMath::Topics.key("  СЧЁТ ")
  end

  def test_registered_filters_project_both_single_tags_and_catalog_options
    template = Liquid::Template.parse('{{ tag | topic_label }};{{ tags | topic_labels | join: "," }}')
    assert_equal "History of Mathematics;People", template.render!("tag" => "history_of_mathematics", "tags" => ["People", "people"])
  end

  def test_ordinary_article_pool_excludes_rubric_tags_and_nonarticles
    make = ->(tags, status = "published", notice = false) { Article.new({"tags" => tags, "status" => status, "translation_notice" => notice}) }
    ordinary = make.call(["History of Mathematics", "Глоссарий"])
    entries = [ordinary, make.call(["персоналии"]), make.call(["PEOPLE"]), make.call(["математики_шутят"]),
      make.call(["Анекдоты"]), make.call(["ЦИТАТЫ"]), make.call(["history"], "draft"),
      make.call(["history"], "demo"), make.call(["history"], "published", true)]
    assert_equal [ordinary], HistoryMath::Topics.article_candidates(entries, ["Персоналии", "People", "Математики шутят", "Анекдоты", "Цитаты"])
    assert_empty HistoryMath::Topics.article_candidates([], [])
  end

  def test_rubrics_require_a_matching_published_article_tag
    make = ->(tags, status = "published", notice = false) { Article.new({"tags" => tags, "status" => status, "translation_notice" => notice}) }
    person = make.call(["персоналии"])
    articles = [person, make.call(["ЖЗЛ"]), make.call(["персоналии ученых"]), make.call(["Персоналии"], "demo"),
      make.call(["Персоналии"], "draft"), make.call(["Персоналии"], "published", true)]
    assert_equal [person], HistoryMath::Topics.rubric_articles(articles, ["Персоналии"])
    assert_empty HistoryMath::Topics.rubric_articles(articles, ["Цитаты"])
    jokes = %w[анекдоты цитаты].map { |tag| make.call([tag]) }
    assert_equal jokes, HistoryMath::Topics.rubric_articles(jokes, ["Анекдоты", "Цитаты", "Математики шутят"])
  end
end

class ReadingSelectionTest < Minitest::Test
  Article = Struct.new(:url, :data)

  def rules
    JSON.parse(File.read(File.expand_path("../site/_data/reading_selection.json", __dir__)))
  end

  def articles(count, glossary = 0)
    Array.new(count) do |index|
      Article.new("/article-#{index.to_s.rjust(3, '0')}/", {"date" => "2026-10-21",
        "tags" => index >= count - glossary ? ["Глоссарий"] : ["History of Mathematics"]})
    end
  end

  def test_fallback_balances_a_glossary_batch_and_keeps_archive_disjoint
    input = articles(43, 27)
    groups = HistoryMath::ReadingSelection.groups(input, rules)
    assert_equal 10, groups.fetch("reading").length
    assert_equal 3, groups.fetch("reading").count { |article| article.data["tags"].include?("Глоссарий") }
    assert_equal 33, groups.fetch("archive").length
    assert_empty groups.fetch("reading") & groups.fetch("archive")
    assert_equal groups.fetch("reading").map(&:url).sort.reverse, groups.fetch("reading").map(&:url)
  end

  def test_window_sparse_series_and_empty_fallback
    input = articles(80, 27)
    groups = HistoryMath::ReadingSelection.groups(input, rules)
    assert groups.fetch("reading").all? { |article| input.last(50).include?(article) }
    assert_equal 10, HistoryMath::ReadingSelection.groups(articles(12, 12), rules).fetch("reading").length
    assert_equal 5, HistoryMath::ReadingSelection.groups(articles(5, 5), rules).fetch("reading").length
    assert_equal({"reading" => [], "archive" => []}, HistoryMath::ReadingSelection.groups([], rules))
  end

  def test_series_keys_use_explicit_series_and_narrow_glossary_tags
    article = Article.new("/example/", {"series" => "History_of_Computing", "tags" => ["History of Mathematics"]})
    assert_equal "history of computing", HistoryMath::ReadingSelection.series_key(article, rules)
    article.data.delete("series")
    assert_equal "", HistoryMath::ReadingSelection.series_key(article, rules)
    article.data["tags"] = ["гЛоСсАрИй"]
    assert_equal "glossary", HistoryMath::ReadingSelection.series_key(article, rules)
  end
end
