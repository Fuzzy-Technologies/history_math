# Mathematics with Mansur-abyi

A multilingual journal of the history of mathematics: people, ideas, problems, and instruments. A Fuzzy Technologies knowledge project.

The first prototype is a warm, responsive reading room built with Jekyll. English is the default site language, with an honest coming-soon home and no English articles. The first content edition is Russian. All five initial articles are clearly marked AI-assisted demonstration examples, not publications attributed to Mansur or Timur.

## Run locally

Requires Ruby 3.3, Bundler 2.4.20, Node.js 22 and Python 3. Install dependencies and build:

```sh
bundle install
npm ci
bundle exec jekyll build
bundle exec jekyll serve
```

Open <http://127.0.0.1:4000/history_math/> or <http://127.0.0.1:4000/history_math/ru/>. Published page paths are generated using `relative_url` and `absolute_url`; no domain-root assumptions are required.

## Check changes

```sh
npm test
bundle exec ruby tests/publication_test.rb
bundle exec jekyll build --trace
python3 scripts/check_site.py _site /history_math
npx playwright install --with-deps chromium
npm run test:browser
bundle exec jekyll build --baseurl '' --destination _site-domain
python3 scripts/check_site.py _site-domain ''
```

The browser suite captures desktop/mobile home, catalog, article and search PNGs plus a JSON report in `test-results/`. It checks real inline/display formula rendering, Cyrillic search, archive rotation, filters, keyboard focus, responsive overflow, images, console errors and automated axe WCAG AA rules. Automated accessibility checks are a baseline, not a complete human audit.

CI stores a downloadable built prototype and browser evidence without publishing feature/develop branches. To view the artifact offline, place its contents under `preview/history_math/`, run `python3 -m http.server 8000 --directory preview`, then open `http://localhost:8000/history_math/ru/`. ES modules and search require an HTTP server rather than `file://`.

## Editorial workflow

`feature/* → develop → master`. Features open PRs into `develop`; Timur makes the merge decision. A separate reviewed PR from `develop` into `master` approves publication. Production deployment only accepts `master`, including manual dispatch. No auto-merge, releases, tags or backlog are introduced by this prototype.

NAS/FELab is the editorial source of truth. This repository is a public publication target, not a private archive or a live NAS mirror. There is no FELab integration in this iteration.

## Project documentation

- [Development protocol](DEVELOPMENT_PROTOCOL.md)
- [Agent instructions](AGENTS.md)
- [Content and future export contract](docs/CONTENT.md)
- [Localization](docs/LOCALIZATION.md)
- [Deployment and administrative setup](docs/DEPLOYMENT.md)
- [Technical reference audit](docs/REFERENCE_AUDIT.md)
- [Changelog](CHANGELOG.md)

Site source is in `site/`; shared HTML lives in `_layouts` and `_includes`. Development documents, templates and tests live outside Jekyll's source. Formula assets are vendored KaTeX 0.16.10, loaded only on articles with `math: true`. Authored SVG illustrations are original prototype assets. Third-party notices are in `site/assets/vendor/katex/LICENSES.txt`. No general license is assigned to authored articles.
