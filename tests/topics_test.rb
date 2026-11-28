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

  def test_article_headings_use_localized_rubrics_with_type_fallback
    rubrics = JSON.parse(File.read(File.expand_path("../site/_data/home_rubrics.json", __dir__)))
    template = Liquid::Template.parse('{{ tags | article_rubric_title: rubrics, lang | default: type }}')
    heading = ->(lang, tags, type = "Essay") do
      template.render!("lang" => lang, "tags" => tags, "type" => type, "rubrics" => rubrics)
    end

    assert_equal "Персоналия", heading.call("ru", ["ПЕРСОНАЛИИ"])
    assert_equal "Profile", heading.call("en", ["People"])
    assert_equal "Математики шутят", heading.call("ru", ["математики_шутят"])
    assert_equal "Mathematicians Joke", heading.call("en", ["People", "Anecdotes"])
    assert_equal "Математики шутят", heading.call("ru", ["Факты"], "Заметка")
    assert_equal "Mathematicians Joke", heading.call("en", ["Facts"], "Note")
    assert_equal "Essay", heading.call("en", ["Lives of Remarkable People"])
    assert_equal "Инструмент", heading.call("ru", ["Геометрия"], "Инструмент")
  end
end

class ReadingSelectionTest < Minitest::Test
  Article = Struct.new(:url, :data)

  def test_both_locales_use_distinct_eligible_cards_from_the_newest_half
    config = JSON.parse(File.read(File.expand_path("../site/_data/reading_selection.json", __dir__)))
    rubrics = JSON.parse(File.read(File.expand_path("../site/_data/home_rubrics.json", __dir__)))
    %w[ru en].each do |lang|
      tags = rubrics.to_h { |r| [r["id"], r.fetch(lang).fetch("tags")] }
      rules = config.merge("rubric_tags" => tags)
      articles = Array.new(65) do |i|
        group = %w[humor people instruments other][i % 4]
        Article.new("/article-#{i.to_s.rjust(3, '0')}", {"date" => "2026-10-21",
          "group" => group, "type" => group == "instruments" ? "instrument" : "essay",
          "tags" => tags.fetch(group, []).take(1)})
      end
      notice = Article.new("/notice", {"date" => "2026-10-22", "translation_notice" => true})
      recent = articles.last(33).reverse
      excluded = recent.take(5).map(&:url)
      groups = HistoryMath::ReadingSelection.groups(articles + [notice], rules, excluded: excluded)
      reading = groups.fetch("reading")
      assert_equal config.fetch("group_limits"), reading.group_by { |r| r.data["group"] }.transform_values(&:length)
      assert_equal reading.map(&:url).sort.reverse, reading.map(&:url)
      assert_empty reading.map(&:url) & excluded
      assert_empty reading - recent
      assert_equal 56, groups.fetch("archive").length
      assert_includes groups.fetch("archive"), notice
      assert_empty reading & groups.fetch("archive")
      assert_empty HistoryMath::ReadingSelection.groups(articles, rules, excluded: recent.map(&:url)).fetch("reading")
      sparse = articles.select { |r| r.data["group"] == "other" }
      assert_equal sparse.last(3).reverse, HistoryMath::ReadingSelection.groups(sparse, rules).fetch("reading")
    end
  end
end
