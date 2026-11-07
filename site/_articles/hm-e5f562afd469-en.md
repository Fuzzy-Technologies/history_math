---
schema_version: 1
article_id: hm-e5f562afd469-en
source_work_id: hm-e5f562afd469
layout: article
title: Fibonacci’s rabbit problem
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-e5f562afd469
description: Fibonacci’s rabbit-breeding problem leads to a sequence in which each term is the sum of the previous two. In the author’s model, there are 233 pairs by the end of the twelfth month.
type: problem
tags:
  - Problems
  - History of Mathematics
  - Fibonacci
  - rabbits
  - biology
  - sequences
math: true
status: draft
permalink: /publications/hm-e5f562afd469-en/
rights_basis: "Mansur Gilmullin"
original_publication:
  outlet: Telegram · history_math
  date: '2024-10-04'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-e5f562afd469/figure-01.jpg
    alt: Two rabbits beside a river at sunset, with conifers on the far bank
    caption: Fibonacci’s rabbit problem. Author’s illustration
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
  - id: fig-2
    path: /assets/images/hm-e5f562afd469/figure-02.png
    alt: "A month-by-month scheme: 1; 1+1=2; 1+2=3; 2+3=5; 3+5=8; 5+8=13; 8+13=21; 13+21=34; 21+34=55; 34+55=89; 55+89=144; 89+144=233"
    caption: How the Fibonacci sequence develops
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
preview_image: /assets/images/hm-e5f562afd469/figure-01.jpg
cover_image: /assets/images/hm-e5f562afd469/figure-01.jpg
---
{% include article-figure.html id="fig-1" %}

The Italian mathematician Leonardo of Pisa (c. 1170–c. 1250), also known as Fibonacci, played an important part in transmitting to Western Europe mathematical methods described in Arabic-language works.

Leonardo Fibonacci’s principal mathematical work was *Liber abaci*, the Book of the Abacus (1202). In it he discussed the recurrent sequence now known as the Fibonacci sequence. Each term after the first two, both equal to 1, is the sum of the preceding two: $1,1,2,3,5,8,13,\ldots$.

Writing the nth term of the Fibonacci sequence as $F_n$, we can express this rule as:

$F_n=F_{n-1}+F_{n-2}$.

The sequence appears in the famous rabbit problem: “How many pairs of rabbits will be born in a year from one pair, if every pair produces another pair each month, the new pair becoming able to reproduce after one month, and no pair dies?”

Fibonacci’s problem is therefore an early example of a mathematical model of population growth.

Our comments on the problem are below.

{% include article-figure.html id="fig-2" %}

## Solution

Answer: by the last day of the twelfth month there will be 233 pairs of rabbits.

The diagram illustrates how the sequence develops. Here is an additional explanation:

- At the start of the first month there is just one newborn pair (1).
- At the end of the first month there is still just one pair, which has now mated (1).
- At the end of the second month the first pair produces a new pair and mates again (2).
- At the end of the third month the first pair produces another new pair and mates again; the second pair only mates (3).
- At the end of the fourth month the first pair produces another new pair and mates again, the second pair produces a new pair and mates again, and the third pair only mates (5).
- So at the start of the fifth month there are 5 pairs of rabbits; by its end there are 8 pairs, and so on.

The term corresponding to the start of the experiment is the first term. The calculations count pairs at the end of each month. There are twelve months, giving 233 pairs by the end of the twelfth month.
