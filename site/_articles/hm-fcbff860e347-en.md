---
schema_version: 1
article_id: hm-fcbff860e347-en
source_work_id: hm-fcbff860e347
layout: article
title: Hippocrates’ lune
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-fcbff860e347
description: Hippocrates of Chios studied crescent-shaped regions between circular arcs that could be squared. The problem asks for a proof that the simplest lune has the same area as an isosceles right triangle.
type: problem
tags:
  - Problems
  - History of Mathematics
  - historical problems
  - Hippocrates
  - lunes
math: true
status: draft
permalink: /publications/hm-fcbff860e347-en/
rights_basis: "Mansur Gilmullin"
original_publication:
  outlet: Telegram · history_math
  date: '2024-07-26'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-fcbff860e347/figure-01.png
    alt: An isosceles right triangle ABC with right angle C; a grey lune lies between an arc centred at C and a semicircle with diameter AB
    caption: Hippocrates’ lune
    source: Mansur Gilmullin’s archive.
    rights_basis: "Illustration from the author’s archive."
preview_image: /assets/images/hm-fcbff860e347/figure-01.png
cover_image: /assets/images/hm-fcbff860e347/figure-01.png
---
{% include article-figure.html id="fig-1" %}

Hippocrates’ lunes are crescent-shaped figures bounded by arcs of two circles. They were studied by Hippocrates of Chios, a Greek mathematician and astronomer of the fifth century BC. He sought lunes that could be squared: figures for which a square of equal area could be constructed. He found three types.

Hippocrates hoped this would lead to a solution of the problem of squaring the circle, but made no substantial progress towards that goal.

The first and simplest squarable lune is shown in the diagram. It is bounded by two arcs: a semicircle whose diameter is the hypotenuse of the isosceles right triangle ABC, a quarter of a square, and a quarter-circle arc with centre C.

Following Hippocrates’ reasoning, prove that the shaded lune has the same area as triangle ABC. Good luck!

The proof is given below.

## Proof

Let the radius of the circle be $BC=a$. Then the square of the hypotenuse is $AB^2=2a^2$.

The semicircle with diameter AB has area $\pi AB^2/8=\pi a^2/4$.

The sector with arc AB and centre C has a quarter of the circle’s area: $\pi a^2/4$.

The area of triangle ABC is $a^2/2$.

The circular segment with arc AB has area $(\pi a^2/4)-(a^2/2)$.

The area of the lune is $(\pi a^2/4)-((\pi a^2/4)-(a^2/2))=a^2/2$, the area of the triangle.

## Notes

Another proof, without calculations, uses a generalisation of the Pythagorean theorem: the sum of the areas of similar circular segments constructed on sides AC and BC equals the area of the similar segment constructed on side AB. Try proving this yourself.
