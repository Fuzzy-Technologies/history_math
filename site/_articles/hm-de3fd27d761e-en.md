---
schema_version: 1
article_id: hm-de3fd27d761e-en
source_work_id: hm-de3fd27d761e
layout: article
title: "Dirac’s three-fishermen problem: a masterpiece of mathematical wit"
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-de3fd27d761e
description: Dirac’s joking answer to the three-fishermen problem—two “antifish”—fits its formal arithmetic. The post explores the idea and gives a family of solutions whose smallest positive catch is 25 fish.
type: problem
tags:
  - Problems
  - historical problems
  - mathematics
  - three fishermen
  - Dirac
math: true
status: draft
permalink: /publications/hm-de3fd27d761e-en/
rights_basis: "Mansur Gilmullin"
original_publication:
  outlet: Telegram · history_math
  date: '2024-05-24'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-de3fd27d761e/figure-01.png
    alt: Three fishermen with fishing rods beside a river, each with a question mark overhead, and fish swimming in the water
    caption: Three fishermen. Author’s illustration
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
  - id: fig-2
    path: /assets/images/hm-de3fd27d761e/figure-02.jpg
    alt: Black-and-white portrait of a young man with dark hair and a narrow moustache, wearing a suit and tie
    caption: Paul Dirac, 1933
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
  - id: fig-3
    path: /assets/images/hm-de3fd27d761e/figure-03.png
    alt: The opening page of I. Kamyshko’s Russian article, with a fisherman throwing back a fish and text on Dirac and the prediction of the positron
    caption: “Paul Dirac and the Problem of the Three Fishermen”. Kvant, 1982, no. 9, p. 30
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
  - id: fig-4
    path: /assets/images/hm-de3fd27d761e/figure-04.png
    alt: "Continuation of the Russian article: the problem and the minus-two-fish joke. After each division, two thirds of (N − 1) remain; after k divisions, the fish count is (2/3)^k(N + 2) − 2"
    caption: “Paul Dirac and the Problem of the Three Fishermen”. Kvant, 1982, no. 9, p. 31
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
  - id: fig-5
    path: /assets/images/hm-de3fd27d761e/figure-05.png
    alt: The top of the page concludes the article with N = −2 + 27n and the smallest positive answer, 25; the lower portion contains answers to other magazine problems
    caption: “Paul Dirac and the Problem of the Three Fishermen”. Kvant, 1982, no. 9, continued on p. 62
    source: Mansur Gilmullin’s archive.
    rights_basis: Mansur Gilmullin
preview_image: /assets/images/hm-de3fd27d761e/figure-01.png
cover_image: /assets/images/hm-de3fd27d761e/figure-01.png
---
{% include article-figure.html id="fig-1" %}

Paul Adrien Maurice Dirac (1902–1984) was a British theoretical physicist, one of the founders of quantum mechanics and a winner of the 1933 Nobel Prize in Physics.

Even during his lifetime, Dirac became a figure in scientific folklore, appearing in many stories of varying reliability.

An intriguing problem about three fishermen is often called “Dirac’s problem”. The name comes from the unexpected, witty and joking answer Paul Dirac gave more than a hundred years ago. Some accounts say that, as a student at Cambridge taking part in a mathematics competition, he offered an unconventional solution to the following problem.

## The problem

Three fishermen spent all day fishing. They decided to sleep on the riverbank and divide their catch in the morning. One could not sleep and decided to leave, taking his share. He counted the fish and divided the catch into three equal parts, with one fish left over. He threw that fish back into the water, took his share and went home. During the night, the second fisherman woke up. Not noticing that his companion had left, he divided the remaining fish into three parts, threw the one left over into the water, took his share and headed home. Towards dawn, the third fisherman did the same, unaware that he was alone. What is the smallest number of fish they could have caught?

## Dirac’s joking answer

We are unlikely ever to know exactly how Dirac approached the problem. He was a master of attaching the prefix “anti” to concepts—antiparticles, for example. Here, apparently true to form, he gave the original answer: minus two fish, or two antifish.

Let us give the famous physicist’s sense of humour its due. From the standpoint of formal mathematics, his answer works, though its claim to be the minimum is questionable.

After the first fisherman released one fish, the number became $(-2)-1=-3$. He then left, taking $(-1)$ fish with him. The number of fish became $(-3)-(-1)=-2$. The second and third fishermen simply repeated his actions.

There are several versions of the answers and solutions, depending on the question asked. “How many fish did they catch?” has many answers, for example. The right question therefore asks for the smallest number of fish—a positive number, unless you are Paul Dirac.

Of course the problem also has a solution in positive integers. It reduces to a Diophantine equation to be solved in integers, or in natural numbers.

Try solving it yourself. Pupils can work backwards by trial and error. You can also write a program to test the possibilities.

## Solution

Answer: 25.

The number of fish satisfying the conditions is given by the formula:

$P = 25 + 27N$, where $N = 0, 1, 2, 3, \ldots$ (how is this obtained?). Thus the smallest positive number of fish is 25. Incidentally, setting $N=-1$ gives $P=-2$, Dirac’s answer.

## Notes

{% include article-figure.html id="fig-2" %}

{% include article-figure.html id="fig-3" %}

{% include article-figure.html id="fig-4" %}

{% include article-figure.html id="fig-5" %}

For more on the solution, see I. Kamyshko, [“Paul Dirac and the Problem of the Three Fishermen”](https://www.kvant.digital/issues/1982/9/kamyishko-pol_dirak_i_zadacha_o_treh_ryibakah-fe0a667b/), *Kvant*, 1982, no. 9 (in Russian).
