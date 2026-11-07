---
schema_version: 1
article_id: hm-3bc5aa34e470-en
source_work_id: hm-3bc5aa34e470
layout: article
title: "Recreational mathematics: Pick’s theorem"
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-3bc5aa34e470
description: Pick’s theorem finds the area of a simple lattice polygon from its numbers of interior and boundary lattice points. The author discusses a worked example, a unit square and a basic lattice triangle, followed by a historical note and reading list.
type: note
tags:
  - Lifehacks
  - Pick’s theorem
  - recreational mathematics
  - geometry
math: true
status: draft
permalink: /publications/hm-3bc5aa34e470-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2023-11-15'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-3bc5aa34e470/figure-01.png
    alt: A lattice polygon with seven red interior and eight green boundary points; the Russian formula S = В + Г/2 − 1 and values В = 7, Г = 8, S = 10 correspond to English I = 7, B = 8 and area 10
    caption: "Pick’s theorem: seven interior and eight boundary points"
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
  - id: fig-2
    path: /assets/images/hm-3bc5aa34e470/figure-02.png
    alt: Black-and-white portrait of a young man with a moustache wearing a suit
    caption: Georg Alexander Pick (1859–1942)
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-3bc5aa34e470/figure-01.png
cover_image: /assets/images/hm-3bc5aa34e470/figure-01.png
---
{% include article-figure.html id="fig-1" %}

Every school pupil has encountered geometry problems on squared paper. One such problem is to calculate the area of a figure drawn on the grid. There are various ways to solve it.

One visual geometric method uses Pick’s theorem: the area of a simple polygon with integer-coordinate vertices on squared paper is:

$S=I+\frac{B}{2}-1$.

Here $I$ is the number of integer-coordinate points—lattice points—inside the polygon, and $B$ is the number on its boundary.

See the example in the picture: if $I=7$ and $B=8$, then $S=10$.

Also:

1. For a unit square, $I=0$, $B=4$ and $S=1$.

2. A triangle with lattice-point vertices and no other lattice points inside it or on its sides has area $\frac12$.

For a triangle, trapezium or parallelogram, the usual area formulas are simpler and quicker to use. But those are several different formulas. When a polygon has five or more vertices, Pick’s theorem works well: it gives the same formula for every polygon.

## Notes

{% include article-figure.html id="fig-2" %}

Historical note. Georg Alexander Pick (1859–1942) was an Austrian mathematician. He studied in Vienna and worked in Prague, Leipzig and Vienna. After the occupation of Prague in 1939, he was excluded from the Czech Academy of Sciences and Arts; on 13 July 1942 he was deported to Theresienstadt, where he died on 26 July. Today he is known for his formula for the area of lattice polygons. He published it in a paper in 1899, but it became popular when Hugo Steinhaus included it in his 1969 book of mathematical recreations.

Reading list (in Russian):

- N. A. Babina, [“Formula Pika” (Pick’s Theorem)](https://pedportal.net/po-zadache/vneklassnaya-rabota/formula-pika-770002).
- N. B. Vasiliev, “Vokrug formuly Pika” (Around Pick’s Theorem), *Kvant*, 1974, no. 12, pp. 39–43.
- A. Kushnirenko, “Tselye tochki v mnogougolnikakh i mnogogrannikakh” (Lattice Points in Polygons and Polyhedra), *Kvant*, 1977, no. 4, pp. 13–20.
- V. V. Prasolov, *Zadachi po planimetrii* (Problems in Plane Geometry), part 2, Moscow: Nauka, 1991, 240 pp.
