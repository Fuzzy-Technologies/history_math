---
schema_version: 1
article_id: hm-tt-0ba0b6281b22-en
source_work_id: tt-0ba0b6281b22
layout: article
title: Farey Sequences
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-0ba0b6281b22
description: Farey sequences form a family of finite sets of rational numbers with distinctive and mathematically
  beautiful properties.
type: essay
tags:
- Experiments
- Farey
- Sequences
- Mediants
math: true
status: published
date: '2024-10-26'
permalink: /articles/hm-tt-0ba0b6281b22/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by the owner; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-10-26'
  url: https://teletype.in/@history_math/Farey-sequence
source_url: https://teletype.in/@history_math/Farey-sequence
figures:
- id: fig-1
  path: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
  alt: A silhouette of John Farey drawn by his friend White Watson, held by Derby Museum and Art Gallery, England
  caption: A silhouette of John Farey drawn by his friend White Watson, held by Derby Museum and Art Gallery, England
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6d/df/6ddf6608-9565-44aa-9fa3-d488c701298b.jpeg
- id: fig-3
  path: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-03.png
  alt: 'A page from Farey’s “On a curious property of vulgar fractions”, in The Philosophical Magazine and Journal:
    Comprehending the various branches of science. the liberal and fine arts, geology, agriculture, manufacturers
    and commerce.,'
  caption: 'A page from Farey’s “On a curious property of vulgar fractions” (The Philosophical Magazine and Journal:
    Comprehending the various branches of science. the liberal and fine arts, geology, agriculture, manufacturers
    and commerce., vol. 47, no. 3, pp. 385–386, 1816)'
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/af/9a/af9a8f22-0ac5-4de4-86b4-e33729af3b46.png
preview_image: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
cover_image: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
---
{% include article-figure.html id="fig-1" %}

> “Farey sequences”, also called Farey series, Farey fractions or a Farey table, form a family of finite subsets of the rational numbers with distinctive and mathematically beautiful properties.

> The Farey sequence of order $n$ is the increasing sequence $F_n$ of all nonnegative reduced fractions not exceeding $1$ whose denominators are at most $n$. The fractions $\frac{0}{1}$ and $\frac{1}{1}$ are taken as the first and last elements of $F_n$.

$$
F_n=\left\lbrace\frac{a}{b}\;\middle|\;0\le a\le b\le n,\ \gcd(a,b)=1\right\rbrace
$$

The fractions are ordered increasingly:

$$
\frac{a_i}{b_i}<\frac{a_{i+1}}{b_{i+1}}
$$

$$
F_1=\left\lbrace\frac{0}{1},\frac{1}{1}\right\rbrace
$$

$$
F_2=\left\lbrace\frac{0}{1},\frac{1}{2},\frac{1}{1}\right\rbrace
$$

$$
F_3=\left\lbrace\frac{0}{1},\frac{1}{3},\frac{1}{2},\frac{2}{3},\frac{1}{1}\right\rbrace
$$

$$
F_4=\left\lbrace\frac{0}{1},\frac{1}{4},\frac{1}{3},\frac{1}{2},\frac{2}{3},\frac{3}{4},\frac{1}{1}\right\rbrace
$$

$$
F_5=\left\lbrace\frac{0}{1},\frac{1}{5},\frac{1}{4},\frac{1}{3},\frac{2}{5},\frac{1}{2},\frac{3}{5},\frac{2}{3},\frac{3}{4},\frac{4}{5},\frac{1}{1}\right\rbrace.
$$

*The definition of the set $F_n$ and Farey sequences up to $n=5$*

John Farey (1766–1826) was an English geologist and writer, and a pioneer of geophysics. He wrote numerous scientific works on geology, metrology, horticulture and music. His only contribution to mathematics was the fractions named after him, arising from his investigations into the mathematics of sound.

In 1816, Farey published a short article, “On a curious property of vulgar fractions”, in which he defined the sequence $F_n$.

{% include article-figure.html id="fig-3" %}

The article came to the attention of the French mathematician Augustin-Louis Cauchy, who published a proof that same year of Farey’s conjecture that each new term in a Farey sequence of order $n$ is the mediant of its neighbours.

A. Ya. Khinchin introduced the concept of the mediant of two fractions in the theory of continued fractions. The mediant of the ordinary fractions $\frac{a}{b}$ and $\frac{c}{d}$ is the ratio of the sum of their numerators to the sum of their denominators: $\frac{a+c}{b+d}$.

The Farey sequence of order $n+1$ can be constructed recursively from the sequence of order $n$ using this rule:

1. Copy all the terms of the sequence of order $n$.
2. If the sum of the denominators of two neighbouring fractions in the sequence of order $n$ is at most $n+1$, insert their mediant between them.

Let us do a small experiment to gain some experience with Farey sequences. Here are some exercises:

1. Try constructing $F_6$ yourself.
2. Prove that if $\frac{a}{b}<\frac{c}{d}$ are neighbouring fractions in the Farey sequence $F_n$, then $bc-ad=1$. The converse also holds: if $\frac{a}{b}<\frac{c}{d}$ satisfy $bc-ad=1$, then they are neighbouring terms in the Farey sequence $F_n$ with $n=\max(b,d)$.
3. The mediant of two fractions has the remarkable property of lying between them. Try proving this.  
  If $\frac{a}{b}<\frac{c}{d}$, then $\frac{a}{b}<\frac{a+c}{b+d}<\frac{c}{d}$.
4. There are exactly $\varphi(n)$ reduced fractions with denominator $n$, where $\varphi$ is the well-known Euler totient function from number theory. If $L_n$ denotes the length of $F_n$, we obtain the recurrence:  
  $L_n=L_{n-1}+\varphi(n)$.

Farey sequences have many interesting applications, including in mathematics olympiads. Computer science investigates various algorithms for generating all the fractions in $F_n$. Farey sequences also offer interesting topics for research projects.

\_\_\_\_\_\_\_\_\_\_

Answers

1. Answer:

$$
F_6=\left\lbrace\frac{0}{1},\frac{1}{6},\frac{1}{5},\frac{1}{4},\frac{1}{3},\frac{2}{5},\frac{1}{2},\frac{3}{5},\frac{2}{3},\frac{3}{4},\frac{4}{5},\frac{5}{6},\frac{1}{1}\right\rbrace.
$$

2. Proof of the forward implication by induction on $n$.

For $n=1$, $F_1$ consists of the pair $\frac{0}{1}$ and $\frac{1}{1}$.

$$
1\times 1 - 0\times 1 = 1
$$

Consider the induction step from $n$ to $n+1$.

Suppose $\frac{a}{b}<\frac{c}{d}$ and $bc-ad=1$. On passing to the next Farey sequence, the mediant $\frac{a+c}{b+d}$ is inserted between them. We will prove that the required relation also holds for the new pairs.

• The pair $\frac{a}{b}$ and $\frac{a+c}{b+d}$:

$$
b(a + c) - a(b + d) = bc - ad = 1
$$

• The pair $\frac{a+c}{b+d}$ and $\frac{c}{d}$:

$$
(b+d)c-(a+c)d=bc-ad=1
$$
