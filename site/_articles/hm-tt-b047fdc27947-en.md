---
schema_version: 1
article_id: hm-tt-b047fdc27947-en
source_work_id: tt-b047fdc27947
layout: article
title: The Thirty-Six Officers Puzzle
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-b047fdc27947
description: "Euler's puzzle asks for 36 officers of six regiments and six ranks in a square with every rank and regiment in each row and column. The impossibility of this arrangement introduces orthogonal Latin squares and their links to combinatorics, algebra and sudoku."
type: essay
tags:
- History of mathematics
- Experiments
- Euler
- Officers
- Latin squares
math: true
status: published
date: '2025-02-02'
permalink: /articles/hm-tt-b047fdc27947/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by Tim55667757; owner approval recorded; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-02-02'
  url: https://teletype.in/@history_math/36-Officers-Puzzle-Using-Latin-Squares
source_url: https://teletype.in/@history_math/36-Officers-Puzzle-Using-Latin-Squares
figures:
- id: fig-1
  path: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-01.png
  alt: Catherine the Great and Leonhard Euler
  caption: Catherine the Great and Leonhard Euler
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/31/2a/312ab4e0-ee8e-45d1-bb9a-e85ad053f363.png
- id: fig-2
  path: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-02.png
  alt: Orthogonal Latin squares of order 5×5
  caption: Orthogonal Latin squares of order 5×5
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/e7/74/e7746c46-4b76-438a-8911-83e31f079e7b.png
- id: fig-3
  path: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-03.png
  alt: A 5×5 table filled with chess pieces of five different ranks and five different colours
  caption: A 5×5 table filled with chess pieces of five different ranks and five different colours
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a4/f7/a4f71cbf-11c0-4639-a413-de719109806d.png
- id: fig-4
  path: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-04.png
  alt: Generalization of the thirty-six officers puzzle for ranks 1–7, represented by chess pieces, and regiments,
    represented by colours. Cases 2 and 6 have no solutions.
  caption: Generalization of the thirty-six officers puzzle for ranks 1–7, represented by chess pieces, and regiments,
    represented by colours. Cases 2 and 6 have no solutions.
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/85/12/85120906-1614-4283-93c2-4e58cc001e53.png
preview_image: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-01.png
cover_image: /assets/images/hm-tt-b047fdc27947/36-officers-puzzle-using-lat-01.png
---
{% include article-figure.html id="fig-1" %}

According to legend, Empress Catherine the Great posed this puzzle to the celebrated mathematician Leonhard Euler.

*“Among 36 officers there are equal numbers of lancers, dragoons, hussars, cuirassiers, horse guards and grenadiers, and also equal numbers of generals, colonels, majors, captains, lieutenants and second lieutenants. Each branch's regiment is represented by officers of all six ranks. Can the officers be arranged in a 6×6 square so that every column and every row contains officers of every regiment and every rank?”*

To avoid confusion over unfamiliar military ranks, let us state it more simply:

*“Arrange 36 officers from six different regiments and of six different military ranks in a square, so that every column and every row contains exactly one officer of each regiment and each rank.”*

Try finding such an arrangement yourself. Begin, for example, with a 3×3 or 4×4 square. The puzzle is also said to be easy with five ranks and five regiments, or seven ranks and seven regiments. Solutions appear later in the article.

The problem was formulated in 1779 in a memoir of the St Petersburg Academy of Sciences, *An Investigation of a New Type of Magic Square*. The memoir began with the problem “On 36 officers”.

Academician Euler struggled with it for a long time. He solved it for 25 officers. After unsuccessful searches in the case of 36, however, he concluded that *“such an arrangement is impossible, although we cannot give a rigorous proof of this”*. Thus another mathematical conjecture arose.

Thousands of mathematicians subsequently worked on it. Only in 1959 was it proved that the problem can be solved for every square number greater than 2×2, except thirty-six. Mathematicians used computers to prove that solutions exist for every number of regiments and ranks greater than two, except six.

## Latin squares {#section-1}

Euler's thirty-six officers problem initiated the study of “Latin squares”.

A Latin square of order n is an n×n square table filled with n distinct elements from a set, each appearing exactly once in every row and column.

Leonhard Euler used letters of the Latin alphabet, giving the squares their name; more precisely, he used Graeco-Latin squares.

{% include article-figure.html id="fig-2" %}

Two Latin squares of the same order are orthogonal if, when superimposed, all the resulting letter pairs are distinct. Euler began their study.

His thirty-six officers problem likewise requires an “orthogonal Latin square” in which two sets of attributes, such as ranks and regiments, simultaneously obey the Latin-square rules.

Consider the solution for 5×5, represented visually using chess pieces. A 5×5 table can be filled with pieces of five different ranks and five different colours.

{% include article-figure.html id="fig-3" %}

Here is the generalization for ranks 1–7, represented by chess pieces, and regiments, represented by colours. Cases 2 and 6 have no solutions.

{% include article-figure.html id="fig-4" %}

Jacques Ozanam mentioned squares resembling Latin squares as early as 1725. A collection of mathematical and physical problems gives the following: *“Arrange 16 playing cards — the aces, kings, queens and jacks of all four suits — in a square so that every suit and every rank occurs exactly once in each row and column.”*

This problem has 6912 solutions. If the same condition is imposed on the diagonals, the number decreases by a factor of 6, to 1152.

In the 1920s–1930s, intensive study of nonassociative algebraic structures led to quasigroup theory, closely connected with Latin squares because there is a one-to-one correspondence between Latin squares and quasigroup Cayley tables.

A new era of the puzzle began in 2016, when researchers at the University of Cambridge arrived at the unexpected idea of making the entries quantum: quantum Latin squares.

Latin squares have extensive applications in algebra, combinatorics, statistics, cryptography, game theory and coding theory. Perhaps their best-known application, however, is sudoku.

## Bibliography {#section-2}

1. Bavrin, I. I.; Fribus, E. A. *Historical Problems: A Book for Students*. Moscow: Prosveshcheniye, 1994. 128 pp. [In Russian]
2. Malykh, A. E.; Kalenkova, A. S. “L. Euler's Investigation of Magic Squares”. In *Proceedings of the All-Russian Conference for Young Researchers with International Participation, Mathematics and Interdisciplinary Research — 2016*, Perm, 16−19 May 2016. Perm: Perm State National Research University, 2016, pp. 30−34. [In Russian]
3. Euler L. Recherches sur une nouvelle espece de quarres maqicues. — Verh. Zeeuwsch. Genootsch. Wetensch. Vlissengen., 1782. — Vol. 9. — P. 85–239.
4. Malykh, A. E. “Euler's Creation of the Combinatorial Theory of Latin Squares”. *Studies in the History of Mathematics*. Moscow: Nauka, 1983, vol. XXVII, pp. 102–123. [In Russian]
5. Tarry G. Le problème des 36 officiers // C.R. Assoc. France Av. Sci. — 1900. — V.29. — N.2. — P. 170–203.
6. Bose R. C., Nair K. R. On complete sets of Latin squares // Sankhya. — 1941. — V.5. — Part 4. — P. 361–382.
