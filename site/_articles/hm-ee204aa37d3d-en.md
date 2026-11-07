---
schema_version: 1
article_id: hm-ee204aa37d3d-en
source_work_id: hm-ee204aa37d3d
layout: article
title: The legend of the chessboard
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-ee204aa37d3d
description: Sessa asks to be rewarded for chess with one grain on the first square, two on the second, and twice as many on each square after that. The legend leads to a geometric series and the largest unsigned 64-bit integer.
type: problem
tags:
  - Problems
  - historical problems
  - mathematics
  - chess
  - legend
math: true
status: draft
permalink: /publications/hm-ee204aa37d3d-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2024-06-07'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-ee204aa37d3d/figure-01.png
    alt: Grains on the first squares of a wooden chessboard double in number from one square to the next
    caption: The legend of the chessboard
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
  - id: fig-2
    path: /assets/images/hm-ee204aa37d3d/figure-02.png
    alt: The number 18,446,744,073,709,551,615 is written across a glass sphere
    caption: 18,446,744,073,709,551,615. Author’s illustration
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-ee204aa37d3d/figure-01.png
cover_image: /assets/images/hm-ee204aa37d3d/figure-01.png
---
{% include article-figure.html id="fig-1" %}

According to one legend, chess was invented by a sage named Sessa, or Seta, who presented the game to the ruler Sheram. The ruler enjoyed it so much that he let the inventor choose his own reward. Sessa asked for one grain of wheat for the first square of the chessboard, two for the second, four for the third, and so on, doubling the number on each successive square.

The ruler, who knew little mathematics, agreed at once. He was even offended that the inventor valued his creation so cheaply, and ordered the treasurer to calculate and pay the required amount of grain.

The next morning, the treasurer showed him the calculations and explained that payment was impossible, unless the seas and oceans were drained and all the land sown with wheat.

You can calculate the reward in the legend for yourself and check it with a little patient counting.

In the seventeenth century, John Wallis (a mathematician, cryptographer and founding member of the Royal Society) included this problem in the chapter on geometric progressions in his [*Mathesis universalis*](https://doi.org/10.3931/e-rara-38680) (1657). He printed the Arabic text and a Latin translation of an extract from al-Safadi’s fourteenth-century commentary.

In later centuries, the story of Sessa and Sheram spread throughout Europe. The wheat-grain problem appears among the exercises on geometric progressions in the [1822 English edition of Leonhard Euler’s *Elements of Algebra*](https://scholarlycommons.pacific.edu/euler-works/387/). There are many Russian retellings; one of the best-known is in Yakov Perelman’s *Mathematics Can Be Fun*.

The problem illustrates how quickly exponential sequences grow.

Moral: treat mathematics with respect!

## Solution

Answer: 18,446,744,073,709,551,615 — eighteen quintillion, four hundred and forty-six quadrillion, seven hundred and forty-four trillion, seventy-three billion, seven hundred and nine million, five hundred and fifty-one thousand, six hundred and fifteen.

The total number of grains on all 64 squares is a geometric series:

$1 + 2 + 4 + \cdots + 2^{63} = 2^{64} - 1$.

This number is the hexadecimal value FFFF FFFF FFFF FFFF and the largest possible value of an unsigned 64-bit integer. In some programming languages, it is the value of a variable declared as unsigned int64.

## Notes

{% include article-figure.html id="fig-2" %}

- Yakov Perelman, “The Legend of the Chessboard”, in *Zhivaya matematika* (in Russian; known in English as Mathematics Can Be Fun), 8th revised and enlarged edition, Moscow: Nauka, 1967, pp. 87–91.

- “Practical Infinity”, in *Matematicheskaya sostavlyayushchaya* (The Mathematical Component, in Russian), edited and compiled by N. N. Andreev, S. P. Konovalov and N. M. Panyunin, Moscow: Mathematical Etudes, 2019, pp. 94–95, 328.

- John Wallis, *Opera mathematica*, vols. 1–3, Oxford, 1693–1699.
