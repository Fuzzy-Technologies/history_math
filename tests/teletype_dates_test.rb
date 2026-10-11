# frozen_string_literal: true

require "minitest/autorun"
require "jekyll"
require_relative "../site/_plugins/publication_dates"

class TeletypeDatesTest < Minitest::Test
  def metadata
    {"source_url" => "https://teletype.in/@history_math/parquet", "original_publication" =>
      {"outlet" => "Teletype", "date" => "2024-06-30", "url" => "https://teletype.in/@history_math/parquet"}}
  end

  def test_owner_migration_date_is_selected
    assert_equal "2024-06-30", HistoryMath.teletype_publication_date(metadata)
  end

  def test_other_outlets_hosts_accounts_and_mismatched_urls_do_not_override
    ["Telegram", "Other"].each do |outlet|
      data = metadata; data["original_publication"]["outlet"] = outlet
      assert_nil HistoryMath.teletype_publication_date(data)
    end
    ["https://teletype.in.evil.invalid/@history_math/parquet", "https://teletype.in/@other/parquet",
      "http://teletype.in/@history_math/parquet", "https://user@teletype.in/@history_math/parquet",
      "https://teletype.in/@history_math/parquet?redirect=1"].each do |url|
      data = metadata; data["source_url"] = url; data["original_publication"]["url"] = url
      assert_nil HistoryMath.teletype_publication_date(data)
    end
    data = metadata; data["source_url"] += "-other"
    assert_nil HistoryMath.teletype_publication_date(data)
  end

  def test_invalid_calendar_date_fails_closed
    data = metadata; data["original_publication"]["date"] = "2024-02-30"
    assert_raises(Jekyll::Errors::FatalException) { HistoryMath.teletype_publication_date(data) }
  end
end
