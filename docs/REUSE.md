# Reused formatting tools

`tools/markdown_tables.py` is reused without logic changes from [1337](https://github.com/Fuzzy-Technologies/1337/blob/4b2e39f064821d39fc4d86c1a6c7b2033dc03d3b/tools/markdown_tables.py), commit `4b2e39f064821d39fc4d86c1a6c7b2033dc03d3b`. Copyright and SPDX notices are retained; the original Apache 2.0 license is in `licenses/1337-Apache-2.0.txt`.

Run `python3 tools/markdown_tables.py --write` to align tracked Markdown tables, or omit `--write` to check them without edits. New Markdown files must be staged first. Escaped pipes, column alignment, fenced/indented code and line endings are preserved. CI applies the same read-only check on feature branches and PRs; regression tests cover cell preservation and literal examples.
