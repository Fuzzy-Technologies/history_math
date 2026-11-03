---
schema_version: 1
article_id: hm-tt-bca7aa61fddc-en
source_work_id: tt-bca7aa61fddc
layout: article
title: A Spatial Generalization of the Pythagorean Theorem
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-bca7aa61fddc
description: "De Gua’s theorem generalizes Pythagoras: in a right tetrahedron, the squared area of the face opposite the right trihedral angle equals the sum of the other three squared face areas. A proof uses orthogonal projections and direction cosines."
type: problem
tags:
- History of mathematics
- Problems
- De Gua’s theorem
- Pythagoras
- Right tetrahedron
math: true
status: published
date: '2025-06-22'
permalink: /articles/hm-tt-bca7aa61fddc/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-21; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-06-22'
  url: https://teletype.in/@history_math/de-gua-theorem
source_url: https://teletype.in/@history_math/de-gua-theorem
figures:
- id: fig-1
  path: /assets/images/hm-tt-bca7aa61fddc/de-gua-theorem-01.png
  alt: A tetrahedron
  caption: A tetrahedron
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/25/fc/25fc5c77-ab87-4337-b3db-2c8e3c9f5741.png
- id: fig-3
  path: /assets/images/hm-tt-bca7aa61fddc/de-gua-theorem-03.png
  alt: A schematic diagram for de Gua’s theorem
  caption: A schematic diagram for de Gua’s theorem
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/27/67/2767ca7c-1c48-455d-ab4c-9926430fe35d.png
preview_image: /assets/images/hm-tt-bca7aa61fddc/de-gua-theorem-01.png
cover_image: /assets/images/hm-tt-bca7aa61fddc/de-gua-theorem-01.png
---
{% include article-figure.html id="fig-1" %}

Many theorems of plane geometry have natural generalizations in solid geometry. What can we say in this respect about the Pythagorean theorem, one of mathematics' most famous theorems?

> *“In a right triangle, the square of the hypotenuse equals the sum of the squares of the legs.”*

There is, it turns out, an elegant spatial generalization for a right tetrahedron: a tetrahedron whose three dihedral angles at one vertex are right angles. It states:

*“In a right tetrahedron, the square of the area of the face opposite the right trihedral angle equals the sum of the squares of the areas of the other three faces.”*

This result is known in the literature as “de Gua's theorem”. In 1783, it was presented to the Paris Academy of Sciences by Jean-Paul de Gua de Malves (1713–1785), a French mathematician and professor at the Royal College in Paris.

However, other mathematicians are known to have been familiar with the result long before him.

René Descartes (1596–1650), for example, mentions a similar fact in his manuscripts, and Charles Tinseau d'Amondans (1748–1822) gives it in his *Mémoire sur les surfaces du second degré* (1774).

Independently of them, Johann Faulhaber (1622), and later Meyer Hirsch in *Sammlung geometrischer Aufgaben* (1807), also investigated this question.

In Soviet literature, the result appears as “Meyer Hirsch's problem”, notably in G. N. Popov's *Collection of Historical Problems in Elementary Mathematics* (1938, p. 57), which gives one of its proofs.

**Meyer Hirsch’s problem (no. 443).**

> Prove that, in a right tetrahedron, the square of the area of the face opposite the right trihedral angle equals the sum of the squares of the areas of the other three faces.

*Meyer Hirsch’s problem in G. N. Popov’s Collection of Historical Problems in Elementary Mathematics (1938, p. 57)*

We consider this beautiful problem an excellent subject for students' research projects on “Different proofs of one theorem”, and offer it for your collection.

There are several ways to prove the theorem:

1. An algebraic and geometric method, using Heron's formula and the Pythagorean theorem.
2. Calculation of the face areas, using the theorem of three perpendiculars.
3. A vector method, using the cross product.
4. A coordinate method.
5. A projection method, using the properties of orthogonal projections.

Here is an elegant, short proof by projections. The area of the orthogonal projection of a plane figure onto another plane equals the figure's area multiplied by the cosine of the dihedral angle between its plane and the projection plane.

To make this clear, picture the right tetrahedron ABCD as a pyramid cut out around one vertex D of a cube.

{% include article-figure.html id="fig-3" %}

For a right tetrahedron, the projections of face ABC onto the coordinate planes are faces ABD, ACD and BCD. Therefore:

$$
S(ABD) = S(ABC)cosα, S(ACD) = S(ABC)cosβ, S(BCD) = S(ABC)cosγ,
$$

where α, β and γ are the angles between face ABC and the coordinate planes. The property of direction cosines — the cosines of these angles — gives:

$$
cos^{2}α + cos^{2}β + cos^{2}γ = 1.
$$

Adding the squared face areas term by term:

$$
S^{2}(ABC) = S^{2}(ABD) + S^{2}(ACD) + S^{2}(BCD).
$$

Q.E.D.

Try producing the other proofs yourself.

## The theorem's educational value {#section-1}

De Gua's theorem is an excellent example for demonstrating:

- The method of analogy in mathematics: moving from 2D to 3D.
- The importance of generalization in mathematics.
- Connections between algebraic and geometric approaches.
- The historical development of mathematical ideas.

As educators observe, studying such analogies between plane and solid geometry helps students better understand spatial geometry.
