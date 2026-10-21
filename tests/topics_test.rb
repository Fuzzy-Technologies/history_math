# frozen_string_literal: true

require "minitest/autorun"
require "liquid"
require_relative "../site/_plugins/topics"

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
