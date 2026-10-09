# frozen_string_literal: true

require "digest"

module HistoryMath
  module ImageAssets
    def image_asset(path)
      site = @context.registers[:site]
      entry = site.data.fetch("image_assets").fetch(path, nil)
      if !entry && path.to_s.match?(/\.(png|jpe?g)\z/i)
        raise Jekyll::Errors::FatalException, "Missing lightweight image: #{path}; run tools/image_assets.py --write"
      end
      entry
    end
  end

  # Validate derivatives during every build, including review and deployment.
  class ValidateImageAssets < Jekyll::Generator
    safe false
    priority :highest

    def generate(site)
      site.data.fetch("image_assets").each do |original, entry|
        ([{"path" => original, "sha256" => entry.fetch("sha256")}] + entry.fetch("variants")).each do |asset|
          path = File.join(site.source, asset.fetch("path").delete_prefix("/"))
          unless File.file?(path) && Digest::SHA256.file(path).hexdigest == asset.fetch("sha256")
            raise Jekyll::Errors::FatalException, "Stale or missing image derivative: #{asset['path']}; run tools/image_assets.py --write"
          end
        end
      end
    end
  end
end

Liquid::Template.register_filter(HistoryMath::ImageAssets)
