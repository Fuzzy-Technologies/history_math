---
schema_version: 1
article_id: hm-tt-ed8bad53e76b-en
source_work_id: tt-ed8bad53e76b
layout: article
title: 'The Knight''s Tour: A Puzzle That Leapt Across the Centuries'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-ed8bad53e76b
description: From Euler to Warnsdorff’s rule, the knight’s tour connects a familiar chess puzzle with Hamiltonian
  paths and algorithmic search.
type: essay
tags:
- History of mathematics
- Experiments
- Euler
- Chess
- Knight
math: true
status: draft
date: '2025-04-09'
permalink: /articles/hm-tt-ed8bad53e76b/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-04-09'
  url: https://teletype.in/@history_math/Knight-tour
source_url: https://teletype.in/@history_math/Knight-tour
figures:
- id: fig-1
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
  alt: Leonhard Euler (1707–1783). Portrait by Jakob Emanuel Handmann, 1753
  caption: Leonhard Euler (1707–1783). Portrait by Jakob Emanuel Handmann, 1753
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/78/fb/78fb66f9-ab5c-446d-b78f-80289eabd368.jpeg
- id: fig-2
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-02.png
  alt: A route supposedly found by the chess automaton known as the Turk
  caption: A route supposedly found by the chess automaton known as the Turk
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/1a/53/1a5371f2-4054-4df4-871d-a8dd7e68847c.png
- id: fig-3
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-03.png
  alt: Cross out squares the knight has already visited. To make the algorithm deterministic, choose the square
    with the lowest number.
  caption: Cross out squares the knight has already visited. To make the algorithm deterministic, choose the square
    with the lowest number.
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/5e/77/5e774b9a-a5f2-4eab-a3b5-f81a666acf61.png
- id: fig-4
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-04.gif
  alt: An animation of a knight visiting every square of a 5 × 5 chessboard
  caption: An animation of a knight visiting every square of a 5 × 5 chessboard
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/c5/2f/c52fc5eb-413a-42c9-aa47-2005687f3fd4.gif
preview_image: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
cover_image: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
---
{% include article-figure.html id="fig-1" %}

In 1759, Leonhard Euler, one of the greatest minds of the Enlightenment, published *“Solution of a curious question which does not seem to be subject to any known method”*. It concerned a problem familiar to every chess player: how can a knight visit all 64 squares of the board without visiting any square twice?

Over time, the problem has been generalized repeatedly. The board need not have 64 squares, for example; it can be any rectangular board divided into m × n equal squares.

Leonhard Euler, Alexandre Vandermonde and others found particular solutions. Naturally, celebrated chess players also tackled it, including Carl Friedrich von Jaenisch and Vasily Nikolayevich Panov.

In graph-theoretic terms, each route visiting every square corresponds to a Hamiltonian path, or to a Hamiltonian cycle if the route is closed, in a graph whose vertices are the board's squares. Two vertices are joined by an edge when a knight can move between their squares in one move. On an 8 × 8 board, the number of closed knight's tours, or Hamiltonian cycles, disregarding direction, is 13 267 364 410 532. The number of open tours, counting direction, is 19 591 828 170 979 904.

The problem admits different mathematical models, algorithms and computer programs, and has also been solved by chess automata.

{% include article-figure.html id="fig-2" %}

In 1823, a certain Warnsdorff published a pamphlet, *The Simplest and Most General Solution to the Knight's Tour Problem*, proposing an algorithm for traversing an 8 × 8 board.

*“At each move, place the knight on a square from which it has the fewest possible moves to squares not yet visited. If several such squares exist, any of them may be chosen.”*

In practice, this rule makes it easy to construct tours. For a long time, however, it was not known whether it always held. Several papers have provided counterexamples to Warnsdorff's rule. Computer-generated counterexamples exist for every starting square. In other words, wherever the knight begins, choices consistent with Warnsdorff's rule can lead it into a dead end before it has visited the entire board.

Nevertheless, try applying the rule. Assume the squares are numbered in some way, for example as in the figure. Cross out squares that the knight has already visited. To make the algorithm deterministic, choose the square with the lowest number.

{% include article-figure.html id="fig-3" %}

This problem appears in several collections of historical and recreational problems, for example:

1. Balk, M. B.; Balk, G. D. *Mathematics After Lessons: A Guide for Teachers*. Moscow: Prosveshcheniye, 1971. 462 pp. [In Russian]
2. Gik, E. Ya. *Chess and Mathematics*. Moscow: Nauka, 1983. 176 pp. [In Russian]
3. Ignatyev, E. I. *In the Kingdom of Ingenuity*. Moscow: Nauka, 1978. 192 pp. [In Russian]

{% include article-figure.html id="fig-4" %}
