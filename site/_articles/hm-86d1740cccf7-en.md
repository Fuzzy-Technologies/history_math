---
schema_version: 1
article_id: hm-86d1740cccf7-en
source_work_id: hm-86d1740cccf7
layout: article
title: Fibonacci’s weighing problem
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-86d1740cccf7
description: Fibonacci’s weighing problem considers sets of weights used on one or both pans of a balance. The answers connect powers of two and three with the history of the problem and its mathematical significance.
type: problem
tags:
  - Problems
  - History of Mathematics
  - Fibonacci
  - weights
  - Mendeleev
  - number systems
math: true
status: draft
permalink: /publications/hm-86d1740cccf7-en/
rights_basis: "Mansur Gilmullin"
original_publication:
  outlet: Telegram · history_math
  date: '2024-09-27'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-86d1740cccf7/figure-01.jpg
    alt: A metal two-pan balance, with a row of weights of different sizes and a wooden case in front
    caption: A balance with a set of weights
    source: Mansur Gilmullin’s archive.
    rights_basis: Illustration accompanying the text.
  - id: fig-2
    path: /assets/images/hm-86d1740cccf7/figure-02.jpg
    alt: A marble statue of Fibonacci in a hood holding a book, with LEONARDO FIBONACCI inscribed on the pedestal
    caption: Giovanni Paganucci. Monument to Fibonacci (1863), Camposanto, Pisa
    source: Mansur Gilmullin’s archive.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-86d1740cccf7/figure-01.jpg
cover_image: /assets/images/hm-86d1740cccf7/figure-01.jpg
---
{% include article-figure.html id="fig-1" %}

Leonardo Fibonacci (c. 1170–c. 1250), the well-known Italian mathematician, greatly enjoyed mathematical tournaments. In his treatises he devoted much attention to mathematical problems and their solutions. Both Fibonacci and his rival, John of Palermo, court philosopher to Frederick II, Holy Roman Emperor, proposed tournament problems.

In *Liber abaci*, Fibonacci posed the problem of choosing the best set of weights for weighing loads on a balance. In Russian histories of mathematics it is known as the Bachet–Mendeleev problem, after the seventeenth-century French mathematician Claude-Gaspard Bachet de Méziriac, who included it in his *Problèmes plaisans et délectables* (1612), and the distinguished Russian chemist Dmitri Ivanovich Mendeleev. Late in life Mendeleev became director of Russia’s Main Bureau of Weights and Measures and had a professional interest in the problem.

Fibonacci gives two versions of the weighing problem:

1. “Find five weights with which any load from 1 to 30 units can be weighed, placing weights on only one pan of the balance.”

2. “Find the smallest number of weights with which every weight below a given limit can be weighed. The weights may be placed on both pans.”

The problem of choosing the best set of balance weights is related to the discovery of binary notation—a binary system of weights.

The weighing problem is significant as one of the earliest optimisation problems in the history of mathematics.

Our comments are below.

## Solution

1. Answer: $1,2,4,8,16$. The solution uses binary notation.

2. Answer: $1,3,9,27,81,\ldots$. The solution uses base three.

## Notes

Fibonacci’s problems continued to appear in mathematics textbooks for several centuries, including:

- Luca Pacioli, *Summa de arithmetica* (1494).
- Bachet de Méziriac, *Problèmes plaisans et délectables* (1612).
- Leonty Magnitsky, *Arifmetika* (1703; in Russian).
- Leonhard Euler, *Algebra* (1768).

The weighing problem is significant, first, as one of the earliest optimisation problems in mathematics. Second, it concerns measurement, a fundamental mathematical problem. It is also connected with number systems, one of the foundations of modern computing.

To weigh whole grams on a pharmaceutical balance, one can use a system called “Fibonacci weights”. It follows the Fibonacci sequence, using weights of $1,2,3,5,8,13,21,\ldots$ grams. Under the conditions of the problems above, however, this system does not minimise the number of weights: powers of two are optimal for one pan, and powers of three for both pans.

{% include article-figure.html id="fig-2" %}

The photograph shows Giovanni Paganucci’s monument to Fibonacci (1863) in the Camposanto cemetery, Pisa, Italy.

Leonardo of Pisa, or Fibonacci (c. 1170–c. 1250), played an important part in transmitting to Western Europe mathematical methods described in Arabic-language works. In *Liber abaci* he also set out divisibility tests for 2, 3 and 5 in detail.
