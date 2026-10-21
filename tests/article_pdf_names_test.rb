# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require_relative "../site/_plugins/article_pdf"

class ArticlePdfNamesTest < Minitest::Test
  def test_both_editions_have_distinct_download_names_without_duplicate_suffixes
    %w[hm-99120459b820 hm-tt-9cd7cf41b694].each do |id|
      paths = %w[ru en].map do |language|
        prefix = language == "ru" ? "/ru" : ""
        expected = "/assets/pdf/#{language}/#{id}-#{language}.pdf"
        assert_equal expected, HistoryMath.article_pdf_path("#{prefix}/articles/#{id}/", language)
        assert_equal expected, HistoryMath.article_pdf_path("#{prefix}/articles/#{id}-#{language}/", language)
        expected
      end
      refute_equal File.basename(paths[0]), File.basename(paths[1])
    end
    assert_equal "/assets/pdf/ru/example-ru.pdf", HistoryMath.article_pdf_path("/ru/articles/example/", "ru")
    assert_equal "/assets/pdf/en/example-en.pdf", HistoryMath.article_pdf_path("/articles/example/", "en")
  end

  def test_wrong_language_routes_and_unsafe_identities_are_rejected
    [["/articles/example/", "ru"], ["/ru/articles/example/", "en"], ["/articles/example/", "fr"],
      ["/ru/articles/../secret/", "ru"], ["/articles/example/?download=1", "en"],
      ["/ru/articles/hm-tt-9cd7cf41b694-en/", "ru"], ["/ru/articles/hm-tt-9cd7cf41b694-ru-ru/", "ru"], [nil, "en"]].each do |path, language|
      assert_raises(Jekyll::Errors::FatalException) { HistoryMath.article_pdf_path(path, language) }
    end
  end
end
