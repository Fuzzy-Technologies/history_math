---
schema_version: 1
article_id: hm-tt-898cdcf51e82-en
source_work_id: tt-898cdcf51e82
layout: article
title: The Extra Square
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-898cdcf51e82
description: "Rearranging an 8 × 8 square seems to produce a 13 × 5 rectangle with an extra unit of area. A narrow gap along the apparent diagonal explains the paradox, while Fibonacci numbers and Cassini’s identity describe the difference in area."
type: essay
tags:
- Experiments
- 64 and 65
- Square
- Fibonacci
- Cassini
math: true
status: published
date: '2024-07-20'
permalink: /articles/hm-tt-898cdcf51e82/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-30; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-07-20'
  url: https://teletype.in/@history_math/Lishnij-kvadrat-07-20
source_url: https://teletype.in/@history_math/Lishnij-kvadrat-07-20
figures:
- id: fig-1
  path: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-01.png
  alt: Where did the extra square come from?
  caption: Where did the extra square come from?
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2d/2b/2d2bfc88-b629-4bff-bfe3-bd0f8f0f8390.png
- id: fig-2
  path: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-02.png
  alt: The cutting diagram
  caption: The cutting diagram
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/f2/d3/f2d363c5-58d9-4048-9973-9c2ac6340c5f.png
- id: fig-3
  path: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-03.png
  alt: Reassembling the cut pieces
  caption: Reassembling the cut pieces
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/18/95/189540e8-0498-4a43-82e3-1443d0cd9933.png
- id: fig-4
  path: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-04.png
  alt: With an ideal cut, the apparent diagonal is actually a very narrow parallelogram
  caption: With an ideal cut, the apparent diagonal is actually a very narrow parallelogram
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/21/d5/21d5604d-5074-4d8f-9e41-259dc159f96d.png
- id: fig-5
  path: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-05.png
  alt: 'Giovanni Domenico Cassini, 1625–1712: an Italian-French mathematician, astronomer and engineer'
  caption: 'Giovanni Domenico Cassini, 1625–1712: an Italian-French mathematician, astronomer and engineer'
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2b/7e/2b7efc57-4fac-4aa1-98bf-4802ec0db2bd.png
preview_image: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-01.png
cover_image: /assets/images/hm-tt-898cdcf51e82/lishnij-kvadrat-07-20-01.png
---
{% include article-figure.html id="fig-1" %}

Take a square with a side length of eight arbitrary units, such as the sides of the cells in a squared notebook. Cut it into four pieces, triangles and trapezoids, as shown below.

{% include article-figure.html id="fig-2" %}

Rearrange the four pieces into a rectangle measuring 13 × 5 units, as shown in the next illustration.

{% include article-figure.html id="fig-3" %}

Now calculate the areas. The square has an area of 8² = 64 square units, while the rectangle has an area of 13 × 5 = 65 square units. Apparently, 64 = 65 square units. How can that be?

The answer is simple, and a chessboard has nothing to do with it: the trick lies in dexterity and mathematical thinking.

The sides of the triangles and trapezoids forming the rectangle's apparent diagonal do not actually lie on one straight line. They leave a barely visible gap in the shape of a parallelogram. Its area is exactly 1 square unit: a phantom quadrilateral.

If you draw the square on paper and cut it out, you may not be able to see this phantom gap.

{% include article-figure.html id="fig-4" %}

P.S. An attentive observer will notice that the lengths used, 3, 5, 8 and 13, are consecutive Fibonacci numbers: F4, F5, F6 and F7.

Mathematicians know that they satisfy Cassini's identity:

$$
F_{n-1}F_{n+1} - F_{n}^{2} = (-1)ⁿ
$$

Substituting gives:

$$
F5 \times  F7 - F_{6}^{2} = (-1)⁶
$$

$$
5 \times  13 - 8^{2} = 1
$$

$$
65 - 64 = 1
$$

Everything is consistent: we have found the extra square.

## Historical note {#section-1}

Cassini's formula was discovered in 1680 by Giovanni Cassini, who was then director of the Paris Observatory.

{% include article-figure.html id="fig-5" %}
