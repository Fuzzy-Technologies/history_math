---
schema_version: 1
article_id: hm-tt-9decb3410914-en
source_work_id: tt-9decb3410914
layout: article
title: The Grass-Divination Problem
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-9decb3410914
description: 'A traditional grass-divination custom becomes a probability
  problem: what is the chance that six paired blades of grass form one ring?'
type: problem
tags:
  - History of mathematics
  - Problems
  - Probability
  - Divination
  - Grass
math: true
status: published
date: '2025-02-02'
permalink: /articles/hm-tt-9decb3410914/
rights_basis: Owner-requested migration of the author's complete Teletype
  publication on 2026-10-11; editorial publication approved by Tim55667757; owner approval recorded; no
  new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-02-02'
  url: https://teletype.in/@history_math/Solving-the-Herb-Divination-Puzzle
source_url: https://teletype.in/@history_math/Solving-the-Herb-Divination-Puzzle
figures:
  - id: fig-1
    path: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
    alt: 'S. L. Kozhin, Ivan Kupala: Divination with Wreaths (2009)'
    caption: 'S. L. Kozhin, Ivan Kupala: Divination with Wreaths (2009)'
    source: Illustrations from the original Teletype article
    credit: ''
    rights_basis: Original image bytes from the owner-supplied Teletype archive,
      migrated at the owner request; original attribution retained; no new
      license asserted.
    source_url: https://img4.teletype.in/files/b0/0c/b00c1cbf-5fa6-4e62-a422-bcc0b71dd11c.jpeg
  - id: fig-2
    path: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-02.png
    alt: A step-by-step schematic solution to the blades-of-grass problem
    caption: A step-by-step schematic solution to the blades-of-grass problem
    source: Illustrations from the original Teletype article
    credit: ''
    rights_basis: Original image bytes from the owner-supplied Teletype archive,
      migrated at the owner request; original attribution retained; no new
      license asserted.
    source_url: https://img3.teletype.in/files/ed/7c/ed7cf71a-9fe1-4034-a27b-272f4770d82a.png
preview_image: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
cover_image: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
---
{% include article-figure.html id="fig-1" %}

“According to tradition, girls in rural Russia once practised this form of divination with grass. One girl held six blades of grass in her hand, with their ends sticking out above and below. Another tied the blades together in pairs, first at the top and then at the bottom. If all six blades were joined into a single ring, this was supposed to mean that the girl would marry that year.”

Now let us turn this legend into a proper probability problem!

{% include article-figure.html id="fig-2" %}

What is the probability that six blades of grass (1), tied together at random, will form a ring?

**Note.** They may fail to form a ring. There may also be several rings (2): one, two or three. We are interested only in the case where there is one large ring.

Here is one solution; follow the step-by-step diagram.

On one side (3), the blades can be tied together in any way. No rings are formed at this stage.

Now consider the other side. Choose any free end. It can be tied to any of the other five. In one case, a closed ring immediately forms (4), which is unsuitable. Any of the other four ends will work.

Four free ends remain (5). Choose one and tie it to one of the other three. Only one of the three is unsuitable, because it produces a small ring of four blades (6). Two of the three possible connections are suitable (7).

Joining the last two ends produces one large ring (8).

To find the probability of the desired outcome, we therefore multiply 4/5 by 2/3, giving 8/15.

**Answer:** 8/15. Thus the girl has a slightly greater than 1/2 chance of getting married!

Try solving the analogous problem for ten blades of grass.
