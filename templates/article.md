---
schema_version: 1
article_id: example-article
source_work_id: example-article
layout: article
title: Article preparation example
authors: [Example author]
author: Example author
lang: en
translation_key: example-article
type: essay
description: A filled structural example for an archival article package.
tags: [example, mathematics]
math: true
status: draft
permalink: /articles/example-article/
rights_basis: Original template text and existing site illustration; not an archival publication.
figures:
  - id: fig-example
    path: /assets/images/example/triangle.svg
    alt: A triangle with a marked base and height.
    caption: Figure 1. Base and height of a triangle.
    source: Existing History Math geometric illustration.
    rights_basis: Site-authored diagram documented in the design asset inventory.
---
## Text and inline mathematics {#text}

The original text belongs here. Inline mathematics uses $a^2+b^2=c^2$.
Keep the complete argument and its notes.[^example-note]

## Display mathematics {#formula}

$$
S=\frac{ah}{2}.
$$

## Figures and tables {#figures}

{% include article-figure.html id="fig-example" %}

| Quantity | Value |
| --- | --- |
| Base | $a$ |
| Height | $h$ |

Refer to the [formula](#formula) or [figure](#fig-example).

## Notes and bibliography {#bibliography}

[^example-note]: Replace with the actual note; do not invent a source, DOI or license.
