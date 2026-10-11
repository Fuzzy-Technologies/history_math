---
schema_version: 1
article_id: hm-tt-1fbd5af8d985-en
source_work_id: tt-1fbd5af8d985
layout: article
title: 'Ozanam''s Dinner Puzzle: Seven Friends and Seventeenth-Century Combinatorics'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-1fbd5af8d985
description: Ozanam’s seven friends want to try every dinner seating. The count depends on whether seats form a
  row or a circle and whether mirror images are distinguished.
type: problem
tags:
- History of mathematics
- Problems
- Ozanam
- Dinner
math: true
status: draft
date: '2025-06-12'
permalink: /articles/hm-tt-1fbd5af8d985/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-06-12'
  url: https://teletype.in/@history_math/Ozanam-Dinner
source_url: https://teletype.in/@history_math/Ozanam-Dinner
figures:
- id: fig-1
  path: /assets/images/hm-tt-1fbd5af8d985/ozanam-dinner-01.png
  alt: 'Illustration 1 for Ozanam’s Dinner Puzzle: Seven Friends and Seventeenth-Century Combinatorics'
  caption: ''
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d8/69/d869b36f-e5f3-4848-a25f-635bb1918b8b.png
preview_image: /assets/images/hm-tt-1fbd5af8d985/ozanam-dinner-01.png
cover_image: /assets/images/hm-tt-1fbd5af8d985/ozanam-dinner-01.png
---
{% include article-figure.html id="fig-1" %}

**Ozanam’s puzzle**, or **the problem of seven friends at dinner**, has become a classical example in combinatorics.

The French mathematician Jacques Ozanam (1640–1718) first formulated it in his famous *Mathematical and Physical Recreations*, the four encyclopedic volumes of Récréations mathématiques et physiques (1694).

This was one of the earliest systematic collections of mathematical recreations and went through at least ten new editions. It anticipated most books on recreational mathematics over the next two centuries.

**The problem:**

*“Seven friends gather for dinner but argue about the seating. To resolve the dispute, they agree to change their seating order until they have tried every possibility. How many times must they dine together to exhaust all combinations?”*

The seven-friends problem belongs to combinatorics, the branch of mathematics studying discrete structures, their arrangements and combinations. Specifically, it concerns permutations: the different ways to order the elements of a set. For n elements, the number of possible permutations is n!, or n factorial.

For seven friends, the number of seating arrangements is therefore:

$$
7! = 7 \times  6 \times  5 \times  4 \times  3 \times  2 \times  1 = 5040
$$

The friends would thus need 5040 dinners to try every arrangement. Ozanam gave precisely this answer, stating that it would take 5040 : 365 ≈ 13,8 years.

He assumed linear seating, with 7 seats in a row along one side of the table, characteristic of formal XVII-century dinners where guests sat according to rank. In later editions (1723), however, his successors added a round-table version. Round tables were associated with informal gatherings.

The table’s shape and seating method radically change the mathematics of the problem.

For a round table without identifying mirror images, proceed as follows:

Fix one person to exclude rotations, which do not create new arrangements. The remaining 6 places can be filled in 6! = 720 ways. This is the standard modern approach.

For a round table with mirror symmetry taken into account, where clockwise and anticlockwise arrangements are considered identical, divide again by 2: 6!/2 = 360 permutations. In this case, just one year would suffice for the friends to try them all.

We have already offered a similar problem about [seating seven friends at a round table](https://t.me/history_math/452), from Henry E. Dudeney’s *The Canterbury Puzzles*, but its conditions were different.
