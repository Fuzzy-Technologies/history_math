---
schema_version: 1
article_id: hm-tt-3baa380bee70-en
source_work_id: tt-3baa380bee70
layout: article
title: 'Kirkman''s Schoolgirl Problem: A Challenge in Combinatorics'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-3baa380bee70
description: "Kirkman's problem arranges fifteen schoolgirls in triples for seven days without repeating a pair. Its solutions, including binary XOR triples, lead to the theory of combinatorial designs and their applications."
type: problem
tags:
- history_of_mathematics
- Kirkman
- schoolgirls
- combinatorics
- problem
- problems
math: true
status: published
date: '2024-10-08'
permalink: /articles/hm-tt-3baa380bee70/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by Tim55667757; owner approval recorded; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-10-08'
  url: https://teletype.in/@history_math/Kirkman-schoolgirls
source_url: https://teletype.in/@history_math/Kirkman-schoolgirls
figures:
- id: fig-1
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
  alt: 'Illustration 1 for “Kirkman''s Schoolgirl Problem: A Challenge in Combinatorics”.'
  caption: ''
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a8/31/a83170d4-c50a-4ff4-8d43-f0d796b9f413.png
- id: fig-2
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-02.png
  alt: Thomas Pennyngton Kirkman (1806–1895), English mathematician. Graduated from the University of Dublin in 1833;
    studied mathematics independently. A parish priest from 1839.
  caption: Thomas Pennyngton Kirkman (1806–1895), English mathematician. Graduated from the University of Dublin in 1833;
    studied mathematics independently. A parish priest from 1839.
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/b5/c0/b5c0a2b7-45dd-4c9f-b5bd-aae9d6e8ed44.png
- id: fig-3
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-03.jpeg
  alt: The cover and a page of The Lady's and Gentleman's Diary for 1850, containing the original publication of Kirkman's
    schoolgirl problem (question 6, at the bottom right of the page).
  caption: The cover and a page of The Lady's and Gentleman's Diary for 1850, containing the original publication of
    Kirkman's schoolgirl problem (question 6, at the bottom right of the page).
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/49/7d/497d2489-c099-41fc-b67f-185319d162cf.jpeg
- id: fig-4
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-04.png
  alt: One solution to Kirkman's schoolgirl problem. The girls are numbered from 0 to 14.
  caption: One solution to Kirkman's schoolgirl problem. The girls are numbered from 0 to 14.
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/b5/d3/b5d3a8c5-063d-44a1-b903-0316e1690348.png
- id: fig-5
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-05.png
  alt: A solution to Kirkman's schoolgirl problem using XOR triples.
  caption: A solution to Kirkman's schoolgirl problem using XOR triples.
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d9/3a/d93a68ae-dd40-4080-8831-d918e450b6fb.png
preview_image: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
cover_image: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
---
{% include article-figure.html id="fig-1" %}

The fifteen schoolgirls problem was long regarded as one of the most famous problems in combinatorics. It was proposed by Thomas Pennyngton Kirkman (1806–1895), an English mathematician and algebraist, and a Fellow of the Royal Society of London (1881). His works provided the first systematic presentation of the elements of group theory in English. He also made a major contribution to combinatorics.

{% include article-figure.html id="fig-2" %}

The fifteen schoolgirls problem appeared in 1850 as Question VI in *The Lady's and Gentleman's Diary*, a recreational mathematics journal published between 1841 and 1871.

{% include article-figure.html id="fig-3" %}

The problem is stated as follows:

> “Fifteen young girls at a school go for a walk in rows of three each day for seven days. Arrange them for each walk so that no two girls walk in the same row twice.”

> (Fifteen young ladies in a school walk out three abreast for seven days in succession: it is required to arrange them daily, so that no two shall walk twice abreast).

Its deceptive simplicity quickly made the problem famous.  
One possible solution is shown in the table below. The girls are numbered from 0 to 14.

{% include article-figure.html id="fig-4" %}

There are known to be seven non-isomorphic solutions to this fifteen schoolgirls problem.

*(An isomorphism is a bijective mapping between sets with the same structure that preserves that structure.)*

The first solution was published by Arthur Cayley in 1850, quickly followed by Kirkman's own solution that year. Kirkman presented it as a special case of his combinatorial arrangement published three years earlier, in 1847. J. J. Sylvester also studied the problem. The puzzle appeared in several recreational mathematics books.

Combinatorial designs became very popular and were even used in gambling fraud. In one reported case, a criminal cartel earned millions of dollars over seven years by buying tickets covering every possible combination of 5 out of 46 in a 6-out-of-46 lottery whenever the ticket cost was lower than the additional bonuses for matching 5 out of 46 plus the chance of winning the jackpot.

Another solution uses XOR triples. If the girls are relabelled with binary numbers from 0001 to 1111, the following arrangement is a solution in which, for any group of three girls, the bitwise XOR of two numbers gives the third.

*(Bitwise exclusive OR, or XOR, is a binary operation equivalent to applying logical exclusive OR to each pair of bits in matching positions in the operands' binary representations.)*

{% include article-figure.html id="fig-5" %}

The problem was generalised to other initial conditions: given n schoolgirls, form groups of size k so that no set of t girls appears together in a group twice. This formulation is called an (n, k, t) design. The problem is solvable under some conditions and unsolvable under others. Over the years, solutions have become known for many combinations of (n, k, t), verified either algebraically or by exhaustive computer search.

The schoolgirl puzzle thus helped to establish a new field of mathematics: combinatorial designs. These designs became a method now used in error-correcting codes in computer science, cryptography, agriculture, sport and design. For example, the classical Hamming error-correcting code uses a solution of the schoolgirl problem.
