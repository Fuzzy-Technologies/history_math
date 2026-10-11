# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "fileutils"
require "open3"
require_relative "../site/_plugins/external_originals"

class ExternalOriginalsTest < Minitest::Test
  PATH = "/assets/images/hm-tt-example/diagram.png"
  PREVIEW_PATH = "/assets/images/previews/hm-tt-example/diagram.png-20.webp"

  def with_fixture
    Dir.mktmpdir("history-math-external-") do |root|
      source = File.join(root, "site")
      original = "exact archival original"
      preview = "verified reading preview"
      sha = Digest::SHA256.hexdigest(original)
      tag = "article-originals-#{sha[0]}"
      FileUtils.mkdir_p(File.join(source, "_data", "article_image_assets"))
      FileUtils.mkdir_p(File.join(source, "assets", "images", "previews", "hm-tt-example"))
      File.write(File.join(source, "_data", "image_assets.json"), "{}")
      File.binwrite(File.join(source, PREVIEW_PATH.delete_prefix("/")), preview)
      entry = {"sha256" => sha, "bytes" => original.bytesize, "width" => 40, "height" => 20, "logo" => false,
        "variants" => [{"path" => PREVIEW_PATH, "width" => 20, "height" => 10,
          "sha256" => Digest::SHA256.hexdigest(preview), "bytes" => preview.bytesize}],
        "external_original" => {"storage" => "github-release", "release_tag" => tag, "asset_id" => 123,
          "url" => "https://github.com/Fuzzy-Technologies/history_math/releases/download/#{tag}/hm-tt-example-diagram-#{sha}.png",
          "api_url" => "https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123",
          "sha256" => sha, "bytes" => original.bytesize}}
      save = -> { File.write(File.join(source, "_data", "article_image_assets", "hm-tt-example.json"), JSON.generate({PATH => entry})) }
      save.call
      yield root, source, entry, original, save
    end
  end

  def test_external_identity_rejects_other_hosts_repositories_queries_and_changed_hashes
    with_fixture do |_root, source, entry, _original, _save|
      assert_equal entry["external_original"], HistoryMath.external_original(entry, PATH)
      assert HistoryMath.validate_external_previews!(entry, source)
      [{"storage" => "raw-git"}, {"asset_id" => 0}, {"asset_id" => 9_007_199_254_740_992},
        {"sha256" => "a" * 64}, {"bytes" => entry["bytes"] + 1}, {"release_tag" => "other"},
        {"url" => entry["external_original"]["url"] + "?raw=1"},
        {"url" => entry["external_original"]["url"].sub("https:", "http:")},
        {"url" => entry["external_original"]["url"].sub("Fuzzy-Technologies", "someone")},
        {"api_url" => entry["external_original"]["api_url"] + "#fragment"},
        {"private_source_path" => "/private/archive"}].each do |change|
        mutated = entry.merge("external_original" => entry["external_original"].merge(change))
        assert_raises(ArgumentError) { HistoryMath.external_original(mutated, PATH) }
      end
      assert_raises(ArgumentError) { HistoryMath.external_original(entry.merge("logo" => "false"), PATH) }
      assert_raises(ArgumentError) { HistoryMath.external_original(entry, PATH.sub("diagram.png", "../diagram.png")) }
    end
  end

  def test_missing_changed_and_escaped_previews_never_allow_absent_originals
    with_fixture do |_root, source, entry, _original, _save|
      assert_raises(ArgumentError) { HistoryMath.validate_external_previews!(entry.merge("variants" => []), source) }
      original_variant = entry["variants"].first
      [{"width" => 41}, {"height" => 21}, {"bytes" => original_variant["bytes"] + 1},
        {"sha256" => "b" * 64}, {"path" => PREVIEW_PATH.sub("diagram", "../diagram")}].each do |change|
        assert_raises(ArgumentError) { HistoryMath.validate_external_previews!(entry.merge("variants" => [original_variant.merge(change)]), source) }
      end
      preview = File.join(source, PREVIEW_PATH.delete_prefix("/"))
      File.delete(preview)
      assert_raises(ArgumentError) { HistoryMath.validate_external_previews!(entry, source) }
      outside = File.join(File.dirname(source), "outside-site.webp")
      File.binwrite(outside, "verified reading preview")
      File.symlink(outside, preview)
      assert_raises(ArgumentError) { HistoryMath.validate_external_previews!(entry, source) }
    end
  end

  def test_ruby_and_node_approval_digests_agree_for_absent_external_originals
    with_fixture do |root, source, entry, original, save|
      text = "Public text\r\n"
      digest = Digest::SHA256.new.update(text.gsub("\r\n", "\n"))
      HistoryMath.update_asset_digest!(digest, source, PATH)
      fixture = File.join(root, "fixture.json")
      File.write(fixture, JSON.generate({"text" => text, "data" => {"figures" => [{"path" => PATH}], "preview_image" => PATH}}))
      script = <<~JS
        import {readFileSync} from 'node:fs';
        import {pathToFileURL} from 'node:url';
        const {packageDigest} = await import(pathToFileURL(process.argv[1]));
        const fixture = JSON.parse(readFileSync(process.argv[2], 'utf8'));
        process.stdout.write(packageDigest(fixture.text, fixture.data, process.argv[3]));
      JS
      output, error, status = Open3.capture3("node", "--input-type=module", "-e", script,
        File.expand_path("../scripts/article-review.mjs", __dir__), fixture, root)
      assert status.success?, error
      assert_equal digest.hexdigest, output
      external_digest = digest.hexdigest
      entry["external_original"]["asset_id"] = 124
      entry["external_original"]["api_url"] = entry["external_original"]["api_url"].sub("/123", "/124")
      save.call
      changed = Digest::SHA256.new.update(text.gsub("\r\n", "\n"))
      HistoryMath.update_asset_digest!(changed, source, PATH)
      refute_equal external_digest, changed.hexdigest
      FileUtils.mkdir_p(File.join(source, "assets", "images", "hm-tt-example"))
      File.binwrite(File.join(source, PATH.delete_prefix("/")), original)
      legacy = Digest::SHA256.new.update(text.gsub("\r\n", "\n"))
      HistoryMath.update_asset_digest!(legacy, source, PATH)
      assert_equal Digest::SHA256.hexdigest("Public text\n\0#{PATH}\0#{original}"), legacy.hexdigest
    end
  end
end
