---
schema_version: 1
article_id: hm-tt-fe2f642f1e5a-en
source_work_id: tt-fe2f642f1e5a
layout: article
title: 'A Divisibility Test for 19: A Number-Theoretic Curiosity'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-fe2f642f1e5a
description: "To test divisibility by 19, remove the last digit, double it and add it to the remaining number, repeating as needed. An algebraic proof explains the rule, and a worked example applies it to 3086379."
type: essay
tags:
- Practical tips
- Divisibility tests
- Pascal
- Prime numbers
- Divisibility
math: true
status: draft
date: '2024-06-03'
permalink: /articles/hm-tt-fe2f642f1e5a/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-06-03'
  url: https://teletype.in/@history_math/Priznak-delimosti-na-19-ehkzotika-v-teorii-chisel-06-04
source_url: https://teletype.in/@history_math/Priznak-delimosti-na-19-ehkzotika-v-teorii-chisel-06-04
figures:
- id: fig-1
  path: /assets/images/hm-tt-fe2f642f1e5a/priznak-delimosti-na-19-ehkz-01.png
  alt: 'Illustration 1 for A Divisibility Test for 19: A Number-Theoretic Curiosity'
  caption: ''
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/75/66/7566f832-00d8-4227-baba-2a11e4206e30.png
- id: fig-2
  path: /assets/images/hm-tt-fe2f642f1e5a/priznak-delimosti-na-19-ehkz-02.png
  alt: Monument to Fibonacci by Giovanni Paganucci (1863), Camposanto cemetery, Pisa, Italy. Leonardo of Pisa (Fibonacci),
    1170–1240, was the first independent mathematician of Western Europe to give a comprehensive account of the
    achievements of mathematicians in Islamic countries and advance beyond them. He also explained the divisibility
    tests for 2, 3 and 5 in detail.
  caption: Monument to Fibonacci by Giovanni Paganucci (1863), Camposanto cemetery, Pisa, Italy. Leonardo of Pisa
    (Fibonacci), 1170–1240, was the first independent mathematician of Western Europe to give a comprehensive account
    of the achievements of mathematicians in Islamic countries and advance beyond them. He also explained the divisibility
    tests for 2, 3 and 5 in detail.
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/94/b6/94b69c59-5aa2-49fe-97f0-519155135960.png
- id: fig-3
  path: /assets/images/hm-tt-fe2f642f1e5a/priznak-delimosti-na-19-ehkz-03.png
  alt: Blaise Pascal (1623–1662), French mathematician, mechanician, physicist, writer and philosopher. One of the
    founders of mathematical analysis, probability theory and projective geometry, a creator of early calculating
    machines, and the author of the fundamental law of hydrostatics. His work also included divisibility tests for
    natural numbers.
  caption: Blaise Pascal (1623–1662), French mathematician, mechanician, physicist, writer and philosopher. One
    of the founders of mathematical analysis, probability theory and projective geometry, a creator of early calculating
    machines, and the author of the fundamental law of hydrostatics. His work also included divisibility tests for
    natural numbers.
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a8/f8/a8f89336-c290-4b07-887d-8a55075a5ae4.png
preview_image: /assets/images/hm-tt-fe2f642f1e5a/priznak-delimosti-na-19-ehkz-01.png
cover_image: /assets/images/hm-tt-fe2f642f1e5a/priznak-delimosti-na-19-ehkz-01.png
---
{% include article-figure.html id="fig-1" %}

A criterion giving a necessary and sufficient condition for an arbitrary natural number N to be divisible by a given natural number m is called a divisibility test for m. Such a criterion is intended to be applied as an algorithm without directly dividing N by m.

Several divisibility tests are derived and widely used in school mathematics: those for 2, 3, 4, 5, 9, 10 and others.

The tests for 2, 3, 5, 9 and 10 have been known since ancient times. The ancient Egyptians knew the test for 2 — even and odd numbers — two thousand years before the Common Era. The Italian mathematician Leonardo Fibonacci (c. 1170–1250) gave detailed accounts of the tests for 2, 3 and 5.

{% include article-figure.html id="fig-2" %}

Blaise Pascal (1623–1662) made a major contribution to the study of divisibility tests. He found an algorithm for constructing a test for the divisibility of any natural number by any other natural number, from which all the particular tests follow. Pascal's general criterion states: *“A natural number N is divisible by a natural number m if and only if the sum of the products of the digits of N and the corresponding remainders obtained by dividing the place-value units by m is divisible by m.”* The general theory of divisibility tests therefore belongs to the theory of congruences, that is, of equal remainders.

{% include article-figure.html id="fig-3" %}

Tests for divisibility by prime numbers are particularly important. Leaving aside the familiar ones, we will show some less usual tests, specifically one for divisibility by 19:

> A number is divisible by 19 without remainder if and only if the number of its tens plus twice its units digit is a multiple of 19.

First try proving this test yourself using elementary algebra\*; a proof is given below.

The algorithm for applying this test is a recurrence method, in which calculations depend on preceding terms of a sequence. It consists of applying the test repeatedly. After a few steps, the result is small enough to divide directly.

## Example {#section-1}

Is 3086379 divisible by 19?

$$
308637 + 9 \times  2 = 308655
$$

$$
30865 + 5 \times  2 = 30875
$$

$$
3087 + 5 \times  2 = 3097
$$

$$
309 + 7 \times  2 = 323
$$

32 + 3 × 2 = 38 (we can already stop here)

$$
3 + 8 \times  2 = 19
$$

$$
19:19 = 1
$$

Answer: yes, 3086379 is divisible by 19.

This test depends on the base of the numeral system; here it is formulated for base 10. Similar tests exist for divisibility by 7, 13, 17 and 23.

## Note {#section-2}

**\*Proof of the divisibility test for 19**

Any number N can be written as N = 10a + b, where a is the number of tens and b is the units digit.

We need to show that N is a multiple of 19 if and only if M = a + 2b is a multiple of 19. Multiply M by 10 and subtract N:

10M – N = 10(a + 2b) – (10a + b) = 19b. This shows that N is a multiple of 19 if and only if M is divisible by 19.
