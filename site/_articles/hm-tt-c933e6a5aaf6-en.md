---
schema_version: 1
article_id: hm-tt-c933e6a5aaf6-en
source_work_id: tt-c933e6a5aaf6
layout: article
title: 'Infinite Descent: Mathematical Induction in Reverse'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-c933e6a5aaf6
description: Fermat's method of infinite descent proves impossibility by constructing an endlessly decreasing sequence of
  natural numbers.
type: essay
tags:
- History of mathematics
- Infinite descent
- Fermat
- Pythagoras
- Euclid
math: true
status: published
date: '2025-06-04'
permalink: /articles/hm-tt-c933e6a5aaf6/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-06-04'
  url: https://teletype.in/@history_math/Infinite-Descent
source_url: https://teletype.in/@history_math/Infinite-Descent
figures:
- id: fig-1
  path: /assets/images/hm-tt-c933e6a5aaf6/infinite-descent-01.png
  alt: Descensus infinitus—infinite descent—a method devised by Pierre de Fermat (1607–1665)
  caption: Descensus infinitus — infinite descent — a method devised by Pierre de Fermat (1607–1665)
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/12/d7/12d7aacb-73e5-4143-a125-44d601c01c74.png
- id: fig-2
  path: /assets/images/hm-tt-c933e6a5aaf6/infinite-descent-02.jpeg
  alt: Fermat and His Muse, sculpture by Théophile Barrau, 1898. Perhaps his muse inspired this method :)
  caption: Fermat and His Muse, sculpture by Théophile Barrau, 1898. Perhaps his muse inspired this method :)
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/c7/c3/c7c38591-ae21-48ce-97e6-ec94a3314d47.jpeg
- id: fig-3
  path: /assets/images/hm-tt-c933e6a5aaf6/infinite-descent-03.png
  alt: Cover of M. F. Gilmullin's Methods of Solving Equations Through Examples (2018)
  caption: Cover of M. F. Gilmullin's Methods of Solving Equations Through Examples (2018). It can be found, for example,
    on Ridero.ru by searching for “Gilmullin Methods of Solving Equations Through Examples.” The cover shows The Thinker (Le
    Penseur), a sculpture by Auguste Rodin (1840–1917). Perhaps the thinker is pondering Fermat's method of infinite descent
    :)
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a5/43/a543a845-fa24-4f53-9907-f0807eef4871.png
preview_image: /assets/images/hm-tt-c933e6a5aaf6/infinite-descent-01.png
cover_image: /assets/images/hm-tt-c933e6a5aaf6/infinite-descent-01.png
---
{% include article-figure.html id="fig-1" %}

*“Since the ordinary methods described in books are insufficient to prove such difficult propositions, I have found an entirely special way of achieving this. I have called this method of proof infinite (infinie) or indefinite (indefinie) descent. At first I used it only to prove negative propositions:
• that no number one less than a multiple of three can be composed of a square and three times a square;
• that no right triangle with integral sides has an area that is a square number.*

*The proof proceeds by reduction to absurdity in this way: if there were a right triangle in whole numbers whose area was a square, there would be another triangle, smaller than it, with the same property.*

*If there were a second triangle smaller than the first with the same property, similar reasoning would give a third smaller than the second with that property, and finally a fourth and a fifth, descending indefinitely.*

*But below a given number there cannot be infinitely many successively smaller numbers — whole numbers are meant throughout. Hence we conclude that no right triangle with square area exists.”*

From Pierre de Fermat's letter to Pierre de Carcavi, French mathematician and academician, 1659.

The **method of infinite descent**, French *descente infinie*, is one of the most elegant and powerful methods of proof in number theory. Pierre de Fermat formulated it in the seventeenth century. Its essence is the impossibility of an infinitely decreasing sequence of natural numbers: if an assumed solution lets us construct smaller and smaller solutions, the original solution cannot exist.

{% include article-figure.html id="fig-2" %}

Infinite descent is a proof by contradiction. It rests on the well-ordering axiom for the natural numbers: every nonempty subset of natural numbers has a least element. Assuming a solution exists, we construct an infinite chain of decreasing solutions and reach a contradiction.

## Example: the irrationality of √2 {#section-1}

The classical proof attributed to the Pythagoreans uses the idea of descent. Suppose √2 is rational: √2 = p/q, where p and q are natural numbers.

Then p² = 2q². This means p is even: p = 2r. Substitution gives q² = 2r², so q is even too. We can therefore divide both p and q by 2 to obtain another representation √2 = p₁/q₁, p > p₁, q > q₁.

We can repeat this operation, choosing smaller p₁ and q₁ again and again. This produces an infinitely decreasing sequence of natural numbers, which is impossible.

Conclusion: √2 is not rational; it is irrational.

Elements of infinite descent were already present in Euclid, particularly in his proof that a composite number has a prime divisor and his proof of the infinitude of primes, Book IX, Proposition 20.

Fermat used descent to prove the n = 4 case of his Last Theorem. Euler, Lagrange and others later adopted his method. Many enthusiasts and amateur mathematicians — “Fermatists” — tried to prove the entire theorem with it, but the method required exceptional rigour, and all of them made mistakes.

Infinite descent is often called “induction in reverse.” Where mathematical induction builds an ascending chain, descent demonstrates the impossibility of a descending one.

It is a kind of bridge between ancient arithmetic and modern number theory. Its elegance and power lie in relying on the simplest property of natural numbers to turn abstract reasoning about infinity into rigorous proofs.

Today infinite descent is used to prove that equations have no integer solutions, especially Diophantine equations. It appears in number-theory problems at mathematics Olympiads.

## Examples {#section-2}

1. Prove that x² + y² + z² = 2xyz has no solutions in natural numbers.

2. Find the integer solutions of 4x³ − 2y³ − z³ = 0.

This method remains an important historical tool, reminding us that even the most difficult problems can be solved with simple ideas.

Would you like to learn more? The method is discussed in detail, with examples, in 📚 M. F. Gilmullin's *Methods of Solving Equations Through Examples* (2018). Find it on Ridero by searching for [“Gilmullin Methods of Solving Equations”](https://ridero.ru/books/catalog/?q=%D0%93%D0%B8%D0%BB%D1%8C%D0%BC%D1%83%D0%BB%D0%BB%D0%B8%D0%BD%20%D0%9C%D0%B5%D1%82%D0%BE%D0%B4%D1%8B%20%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%8F%20%D1%83%D1%80%D0%B0%D0%B2%D0%BD%D0%B5%D0%BD%D0%B8%D0%B9%20%D0%B2%20%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80%D0%B0%D1%85).

{% include article-figure.html id="fig-3" %}
