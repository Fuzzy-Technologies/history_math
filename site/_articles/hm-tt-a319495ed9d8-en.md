---
schema_version: 1
article_id: hm-tt-a319495ed9d8-en
source_work_id: tt-a319495ed9d8
layout: article
title: Clever Soldiers at an Inn
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-a319495ed9d8
description: An old recreational problem by Ye. I. Ignatyev leads from soldiers’ dinner bill to the Josephus recurrence.
type: problem
tags:
- History of mathematics
- Problems
- Ignatyev
- Clever tricks
- Josephus
math: true
status: published
date: '2025-04-09'
permalink: /articles/hm-tt-a319495ed9d8/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-04-09'
  url: https://teletype.in/@history_math/Tricky-soldiers-in-the-tavern
source_url: https://teletype.in/@history_math/Tricky-soldiers-in-the-tavern
figures:
- id: fig-1
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
  alt: Tilborch, Gillis van - Guardroom.jpg. The Guardroom by Gillis van Tilborch (c. 1625–c. 1678), from the Hermitage
    collection
  caption: Tilborch, Gillis van - Guardroom.jpg. The Guardroom by Gillis van Tilborch (c. 1625–c. 1678), from the
    Hermitage collection
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/69/ba/69ba7ba6-8e50-4be8-9ec9-e56f269d0a62.jpeg
- id: fig-2
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-02.png
  alt: Diagram of the soldiers’ seating for Yemelyan Ignatyevich’s problem
  caption: Diagram of the soldiers’ seating for Yemelyan Ignatyevich’s problem
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/5b/bb/5bbb1758-bb91-4bc1-b873-784aa9ae4c5f.png
- id: fig-3
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-03.png
  alt: 'Ignatyev, Ye. I. In the Realm of Ingenuity, or Arithmetic for Everyone. — Parts 1–3. — St Petersburg: V.
    L. Bogushevsky, 1908–1911'
  caption: 'Ignatyev, Ye. I. In the Realm of Ingenuity, or Arithmetic for Everyone. — Parts 1–3. — St Petersburg:
    V. L. Bogushevsky, 1908–1911'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6a/11/6a11d688-27e4-4a1d-8dc8-48c0d31a105d.png
- id: fig-4
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-04.png
  alt: 'The historical Josephus problem in Knuth’s Concrete Mathematics: A Foundation for Computer Science (2009)'
  caption: 'The historical Josephus problem in Knuth’s Concrete Mathematics: A Foundation for Computer Science (2009)'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2e/f4/2ef4345b-c20a-41a1-9eca-3ca05dfc009a.png
- id: fig-5
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-05.jpeg
  alt: Imaginary portrait of Josephus. Illustration by Thomas Addis Emmet, 1880
  caption: Imaginary portrait of Josephus. Illustration by Thomas Addis Emmet, 1880
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2c/b6/2cb65096-d61d-4e54-9609-3d42fbd0ae16.jpeg
preview_image: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
cover_image: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
---
{% include article-figure.html id="fig-1" %}

For your mathematical recreation, here is an old problem from Yemelyan Ignatyevich Ignatyev's book In the Realm of Ingenuity:

*“Four tables stood in an inn, forming a quadrilateral. 21 hungry soldiers returning from manoeuvres stopped there for dinner and invited the innkeeper to join them. They sat as follows: the soldiers occupied three tables, 7 at each, while the innkeeper sat at the fourth.”*

{% include article-figure.html id="fig-2" %}

*“The soldiers agreed with the innkeeper that the last person remaining would pay the bill under the following rule: count everyone, including the innkeeper, clockwise around the circle, and release every seventh person. Each person released left the inn, and the innkeeper himself was the last to remain. With whom did the counting begin?”*

Ye. I. Ignatyev gives only the answer: *“The counting must begin with the 6th soldier seated to the innkeeper's left.”* He does not provide a solution method.

Try finding the starting person yourself in a similar case, for example if there were 4 soldiers at each of the three tables.

We will ask you to explain why the counting must begin there. The solution appears at the end of the article.

## Historical background {#section-1}

{% include article-figure.html id="fig-3" %}

Yemelyan Ignatyevich Ignatyev (1869–1923) was a Russian and Soviet mathematics educator and author of popular-science books. His best-known work, In the Realm of Ingenuity, appeared in three volumes in 1908–1911:

Ignatyev, Ye. I. In the Realm of Ingenuity, or Arithmetic for Everyone. — Parts 1–3. — St Petersburg: V. L. Bogushevsky, 1908–1911.

The problem resembles the historical Josephus problem, known since 1612, when the French mathematician Bachet de Méziriac published it in his collection Problem es Plaisants. Its story is based on an account in Josephus' historical work The Jewish War.

{% include article-figure.html id="fig-4" %}

The problem is as follows: 41 soldiers stand in a circle. Starting with the first soldier, they kill every third person. Where should one stand to be the last survivor?

{% include article-figure.html id="fig-5" %}

Josephus (Latin Josephus Flavius, c. 37–c. 100 CE) was an ancient Jewish historian and military commander. He is known for works that survive in Greek: The Jewish War, about the revolt of 66–71, and Antiquities of the Jews, recounting Jewish history from the creation of the world to the Jewish War.

## Solution {#section-2}

An algorithm for solving the problem appears in the book:

Donald Knuth, Ronald Graham, Oren Patashnik. Concrete Mathematics: A Foundation for Computer Science. \[Translated from English.\] — 2nd ed. — Moscow: Williams, 2009. — 784 pp.

This is a well-known recurrence problem in computer algebra. It is often used as a test problem in various settings, including interviews.

We will use the familiar recurrence formulas for the Josephus problem. In the more general version, n soldiers are counted around a circle and every kth soldier is killed. Denote the safe position, that of the last survivor, by J(n, k).

Let us model the process by creating a list of 22 elements: 0 is the innkeeper and 1–21 are the soldiers.

The following recurrence is known in the language of modular arithmetic:

J(n, k) = (J(n − 1, k) + k) mod n, where J(1, k) = 0.

In the classical Josephus problem with n = 22 and k = 7, the last survivor's position is calculated as J(22,7). Here we need the reverse: knowing that the last person is at position 0, the innkeeper, find the starting position. If the standard start at position 0 leaves the survivor at J(n,k), then to leave position x last, counting must begin at (x − J(n,k)) mod n. The formula for the starting position is also known: S = (x − J(n,k)) mod n, where x is the desired last survivor.

For our problem, n = 22, k = 7, x = 0 (the innkeeper). Recursive calculation — try it by hand — gives J(22,7) = 16.

$$
\begin{aligned}J(1,7) = 0,  \\J(2,7) = (J(1) + 7) mod 2 = (0 + 7) mod 2 = 1,  \\J(3,7) = (1 + 7) mod 3 = 8 mod 3 = 2, ...  \\J(21,7) = (2 + 7) mod 21 = 9 mod 21 = 9,  \\J(22,7) = (9 + 7) mod 22 = 16 mod 22 = 16.\end{aligned}
$$

We need the last position to be 0. The formula therefore gives:

$$
S = (0 - 16) mod 22 = (-16) mod 22 = 6
$$

Thus, counting must begin at position 6.

**Check:** arrange all the participants in a circle — 0 is the innkeeper and 1–21 are the soldiers — and begin counting at position 6. Successively removing every 7th person leaves the innkeeper last.

**Answer:** counting must begin with the 6th soldier seated to the innkeeper's left.
