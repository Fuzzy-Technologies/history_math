---
schema_version: 1
article_id: hm-tt-dd2ef8a97500-en
source_work_id: tt-dd2ef8a97500
layout: article
title: The Chinese Remainder Theorem
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-dd2ef8a97500
description: "The Chinese remainder theorem determines an integer modulo the product of pairwise coprime divisors from its remainders. Sunzi’s problem, whose smallest solution is 23, is solved by enumeration, algebra and the general algorithm using modular inverses."
type: essay
tags:
- history_of_mathematics
- CRT
- Chinese_remainder_theorem
- remainders
- modular_arithmetic
- congruences
math: true
status: published
date: '2026-02-05'
permalink: /articles/hm-tt-dd2ef8a97500/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2026-02-05'
  url: https://teletype.in/@history_math/chinese-remainder-theorem
source_url: https://teletype.in/@history_math/chinese-remainder-theorem
figures:
- id: fig-1
  path: /assets/images/hm-tt-dd2ef8a97500/chinese-remainder-theorem-01.webp
  alt: 'China''s famous Terracotta Army: an illustration for the legend about military formations.'
  caption: 'China''s famous Terracotta Army: an illustration for the legend about military formations.'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/f0/59/f0595e1e-5a40-433c-96f6-db16c8f021e3.webp
- id: fig-2
  path: /assets/images/hm-tt-dd2ef8a97500/chinese-remainder-theorem-02.png
  alt: 'Explanation of the problem solved by Sunzi''s algorithm: 2⋅70 + 3⋅21 + 2⋅15 = 233.'
  caption: 'Explanation of the problem solved by Sunzi''s algorithm: 2⋅70 + 3⋅21 + 2⋅15 = 233.'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/f9/c1/f9c121af-e845-4674-88a6-713886b19b5f.png
preview_image: /assets/images/hm-tt-dd2ef8a97500/chinese-remainder-theorem-01.webp
cover_image: /assets/images/hm-tt-dd2ef8a97500/chinese-remainder-theorem-01.webp
---
{% include article-figure.html id="fig-1" %}

There is a legend.

Commanders in ancient China supposedly gave a series of orders such as “Form rows of 7!”, “Form rows of 11!”, and so on, observing each time how many soldiers were left in the final row. Using only those remainders, they then calculated the total number of soldiers.

In mathematical literature, the algorithm for solving such problems is called the Chinese remainder theorem, often abbreviated CRT.

The theorem has a beautiful meaning: it allows an integer to be recovered from its remainders upon division by several numbers, provided those numbers are pairwise coprime. This is a classical result of number theory that has long extended beyond “pure mathematics” into computer algebra and cryptography.

## Historical background {#section-1}

The idea is described in arithmetic form in a treatise known as the *Sunzi Suanjing*, traditionally assigned to an early period, usually the third century CE. In the thirteenth century, the Chinese mathematician Qin Jiushao substantially generalised these methods in *Mathematical Treatise in Nine Sections* (1247), providing a systematic algorithm for solving such problems.

## A problem from Sunzi's book {#section-2}

> *“Suppose there is an unknown number of objects. When divided into threes, 2 remain; when divided into fives, 3 remain; when divided into sevens, 2 remain. How many objects are there?”*

After solving this particular problem, the text gives an algorithm for the general case, with arbitrary remainders:

> *“Multiply the remainder upon division into threes by 70. Add the product of the remainder upon division into fives and 21, then add the product of the remainder upon division into sevens and 15. If the result is 106 or more, subtract a multiple of 105.”*

Let us check our values:

$$
2⋅70 + 3⋅21 + 2⋅15 = 233 = 105⋅2 + 23
$$

The smallest solution is therefore 23.

{% include article-figure.html id="fig-2" %}

Why do 70, 21 and 15 appear here? There is no magic: in modern mathematical language, they involve partial products and their modular inverses, the “building blocks” of the general algorithm.

## Two elementary explanations {#section-3}

## Method 1: combinatorial {#section-4}

Write out the sets of solutions to the three separate conditions. It is enough to consider numbers up to 3⋅5⋅7 = 105:

x ≡ 2 (mod 3): {2, 5, 8, 11, 14, 17, 20, 23, 26, …}  
x ≡ 3 (mod 5): {3, 8, 13, 18, 23, 28, …}  
x ≡ 2 (mod 7): {2, 9, 16, 23, 30, …}

The answer must lie in the intersection of the three sets. In our case, the smallest common number is 23. The next are 128, 233 and so on: all solutions have the form 23 + 105k.

## Method 2: algebraic {#section-5}

Write the conditions as equalities with integer parameters:

$$
\begin{aligned}x = 2 + 3q  \\x = 3 + 5p  \\x = 2 + 7t\end{aligned}
$$

We then successively reconcile the first two equalities, followed by the resulting expression and the third:

2 + 3q = 3 + 5p  
q = (5p + 1)/3 = p + (2p + 1)/3  
2p + 1 = 3u  
p = (3u − 1)/2 = u + (u − 1)/2  
u − 1 = 2v  
u = 2v + 1  
x = 3 + 5p = 3 + 5(u + v) = 3 + 5(2v + 1 + v) = 8 + 15v  
8 + 15v = 2 + 7t  
t = (15 v + 6)/7 = 2v + (v + 6)/7  
v + 6 = 7w  
v = 7w − 6  
t = 2(7w − 6) + w = 15w − 12  
x = 2 + 7(15w − 12) = 105w − 82 = 105(w − 1) + 23

The result is x = 105(w − 1) + 23. Thus the smallest solution is 23, and the others are obtained by adding 105.

(The parameters q, p, t, u, v, w are understood to be integers.)

## General statement and algorithm {#section-6}

In number theory, the theorem is stated in the language of systems of linear congruences.

Let m₁, m₂, …, mₖ be pairwise coprime positive integers: gcd(mᵢ, mⱼ) = 1 for any i ≠ j.

Let r₁, r₂, …, rₖ be arbitrary integers, usually with rᵢ the remainder upon division by mᵢ. Then the system of congruences

$$
x ≡ rᵢ (mod mᵢ), i = 1, …, k
$$

has a solution, and all its solutions are congruent modulo M = m₁⋅m₂⋅…⋅mₖ.

**One standard algorithm is as follows**; various proofs are known:

1. Calculate the overall modulus:  
  M = m₁⋅m₂⋅…⋅mₖ
2. Calculate the partial products for each i:  
  Mᵢ = M/mᵢ
3. Find the inverses:  
  for each i, find yᵢ such that Mᵢ⋅yᵢ ≡ 1 (mod mᵢ)  
  (For example, use the extended Euclidean algorithm.)
4. Find a solution:  
  x = (r₁⋅M₁⋅y₁ + r₂⋅M₂⋅y₂ + … + rₖ⋅Mₖ⋅yₖ) (mod M)

For our example:

x ≡ 2 (mod 3)  
x ≡ 3 (mod 5)  
x ≡ 2 (mod 7)

$$
M = 3⋅5⋅7 = 105
$$

$$
\begin{aligned}M_{1} = 35  \\M_{2} = 21  \\M_{3} = 15\end{aligned}
$$

Find the inverses:

$$
\begin{aligned}M_{1}⋅y_{1} ≡ 1 (mod 3)  \\35⋅y_{1} ≡ 1 (mod 3)  \\y_{1} = 2\end{aligned}
$$

$$
\begin{aligned}M_{2}⋅y_{2} ≡ 1 (mod 5)  \\21⋅y_{2} ≡ 1 (mod 5)  \\y_{2} = 1\end{aligned}
$$

$$
\begin{aligned}M_{3}⋅y_{3} ≡ 1 (mod 7)  \\15⋅y_{3} ≡ 1 (mod 7)  \\y_{3} = 1\end{aligned}
$$

Then x ≡ 233 (mod 105), and 233 = 105⋅2 + 23, so x ≡ 23 (mod 105).

As you can see, every method reaches the same result, simply by a different route.

📚 [Mathematics with Mansur-abyy](https://t.me/history_math)
