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
permalink: /publications/example-article/
rights_basis: Original template text and existing site illustration; not an archival publication.
figures:
  - id: fig-example
    path: /assets/images/publications/history-cover.png
    alt: Cover of the journal’s history book.
    caption: Figure 1. Cover of the journal’s history book.
    source: Existing journal artwork.
    rights_basis: Owner-supplied cover already used on the journal site.
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
| -------- | ----- |
| Base     | $a$   |
| Height   | $h$   |

Refer to the [formula](#formula) or [figure](#fig-example).

## Notes and bibliography {#bibliography}

[^example-note]: Replace with the actual note; do not invent a source, DOI or license.
