---
schema_version: 1
article_id: hm-06ce1a45f8b9-en
source_work_id: hm-06ce1a45f8b9
layout: article
title: Experiments with Pythagorean triples
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-06ce1a45f8b9
description: Can a right triangle have integer side lengths and a leg of 2025? The author gives a hint using a leg of 25, then supplies the answer and formulas for an infinite family of Pythagorean triples.
type: problem
tags:
  - Experiments
  - Pythagorean triples
  - number theory
  - geometry
math: true
status: draft
permalink: /publications/hm-06ce1a45f8b9-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2024-07-03'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-06ce1a45f8b9/figure-01.png
    alt: A right triangle with legs a and b and hypotenuse c, with blue, red and purple squares on its sides
    caption: A right triangle and squares on its sides
    source: Adapted from Pythagorean.svg by Michael Hardy, Wapcaplet, Steff and Leo2004; Wikimedia Commons. Colours and canvas margins changed; rasterized to PNG.
    credit: Michael Hardy, Wapcaplet, Steff and Leo2004; Wikimedia Commons
    rights_basis: Derivative of Pythagorean.svg, published under the source file’s CC BY-SA 3.0 licence.
    source_url: https://commons.wikimedia.org/wiki/File:Pythagorean.svg
    license: CC BY-SA 3.0
    license_url: https://creativecommons.org/licenses/by-sa/3.0/
preview_image: /assets/images/hm-06ce1a45f8b9/figure-01.png
cover_image: /assets/images/hm-06ce1a45f8b9/figure-01.png
---
{% include article-figure.html id="fig-1" %}

The legendary school of Pythagoras laid the foundations of mathematical science.

Among other problems, its members looked for right triangles with integer side lengths. One method known at the time yields infinitely many triples of positive integers $(a,b,c)$ satisfying $a^2+b^2=c^2$. It does not describe every such triple.

Following the Pythagoreans, can you work out whether a right triangle with integer side lengths can have a leg of 2025?

A hint, using $a=25$:<br>
$b=(625-1)/2=312$.<br>
$c=(625+1)/2=313$.

## Notes

Answer: yes, such a triangle exists.

$a=2025$.<br>
$b=2050312$.<br>
$c=2050313$.

### Historical note

[In his commentary on Euclid’s Proposition I.47](https://www.gutenberg.org/cache/epub/79455/pg79455-images.html), Proclus describes a method for finding such triples that was attributed to Pythagoras.

$a=m$, where $m$ is an odd positive integer greater than 1.<br>
$b=(m^2-1)/2$.<br>
$c=(m^2+1)/2$.
