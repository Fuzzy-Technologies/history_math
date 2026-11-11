---
schema_version: 1
article_id: hm-d2945cab92a5-en
source_work_id: hm-d2945cab92a5
layout: article
title: Perelman’s number-plate problem
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-d2945cab92a5
description: Three students recall that a four-digit car number is a perfect square with matching digits in the first pair and in the last pair. Perelman’s problem narrows the possibilities using divisibility by 11.
type: problem
tags:
  - Problems
  - History of Mathematics
  - Perelman
  - number plates
  - cars
  - divisibility
  - perfect squares
math: true
status: published
permalink: /publications/hm-d2945cab92a5-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2024-10-18'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-d2945cab92a5/figure-01.png
    alt: A vintage car on a city street, with XXXX in place of the four digits on its number plate
    caption: The car number problem. Author’s illustration
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-d2945cab92a5/figure-01.png
cover_image: /assets/images/hm-d2945cab92a5/figure-01.png
---
{% include article-figure.html id="fig-1" %}

This problem about three unusually observant mathematics students is adapted from Yakov Perelman’s [*Algebra Can Be Fun*](https://mirtitles.org/2012/05/23/yakov-perelman-algebra-can-be-fun/).

Walking through a town, three mathematics students saw a driver flagrantly break the traffic rules. None remembered the car’s four-digit number — number plates once had only four digits — but, being mathematicians, each had noticed a particular feature of it.

One recalled that its first two digits were identical. Another remembered that the last two digits were identical too. The third maintained that the four-digit number was a perfect square. Can these clues identify the number?

Of course, this would hardly happen to real students. Even so, it makes a number-theory competition problem that can be studied in preparation for such contests.

How would you solve it? Try for yourself before reading the solution.

## Solution

Answer: 7744.

Write the first and second digits as $x$ and the third and fourth as $y$. The whole number is then:

$1000x+100x+10y+y=1100x+11y=11(100x+y)$.

The number is divisible by 11. Since it is a perfect square, it must also be divisible by $11\times11$. Thus $100x+y$ is divisible by 11. Subtract $99x$, a multiple of 11, to see that $x+y$ is also divisible by 11. The first digit $x$ is nonzero, so $1\le x+y\le 18$ and hence $x+y=11$.

Now check all the possibilities.

The last digit $y$ of a perfect square can only be $0,1,4,5,6,9$. The corresponding values of $x=11-y$ are $11,10,7,6,5,2$. The first two, 11 and 10, cannot be digits.

The candidates are $7744,6655,5566,2299$.

$7744=88\times88$ works.

$6655,5566,2299$ are not perfect squares.
