---
schema_version: 1
article_id: hm-tt-0a8e3e9ac2f8-en
source_work_id: tt-0a8e3e9ac2f8
layout: article
title: Magnitsky’s Mixing Method
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-0a8e3e9ac2f8
description: Mixture word problems received considerable attention in early mathematical texts, including Leonty
  Magnitsky’s Arithmetic.
type: essay
tags:
- History of Mathematics
- Experiments
- Magnitsky
- Mixtures
- Fish Diagram
math: true
status: draft
date: '2025-01-03'
permalink: /articles/hm-tt-0a8e3e9ac2f8/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-01-03'
  url: https://teletype.in/@history_math/Magnitsky-Arithmetic
source_url: https://teletype.in/@history_math/Magnitsky-Arithmetic
figures:
- id: fig-1
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
  alt: The cover of L. F. Magnitsky’s textbook Arithmetic, That Is, the Science of Numbers, 1703
  caption: The cover of L. F. Magnitsky’s textbook Arithmetic, That Is, the Science of Numbers, 1703
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/11/8d/118d1e53-21b5-4e3e-b4f4-223ed119bf0e.jpeg
- id: fig-2
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-02.png
  alt: A diagram showing the ratio in which the original solutions should be mixed
  caption: A diagram showing the ratio in which the original solutions should be mixed
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/53/58/5358c5e2-222c-4cf1-8aea-f4e70819f12f.png
- id: fig-3
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-03.png
  alt: The “fish” diagram
  caption: The “fish” diagram
  source: Illustrations from the original Teletype article
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/13/55/1355be6c-5b2f-42a7-aaf0-0501bb6cc3bc.png
preview_image: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
cover_image: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
---
{% include article-figure.html id="fig-1" %}

Mixture word problems received considerable attention in early mathematical texts, including the *Arithmetic* of Leonty Filippovich Magnitsky. This old method appears under several names in the literature: “Magnitsky’s method”, the “fish method”, and the “cross method”.

Problems involving mixtures and alloys appear in Russia’s OGE and EGE school examinations and in mathematics olympiads, so their solution methods receive a certain amount of attention. The method presented here can be regarded as another useful shortcut.

Let us consider a problem from L. F. Magnitsky’s *Arithmetic*.

*“A man had two kinds of wine for sale. The first cost 10 grivnas per bucket, and the second 6 grivnas. He wished to take some of each and make a third wine that would cost 7 grivnas per bucket. What portions of the two wines should he take to fill a bucket of the third wine costing 7 grivnas?”*

There are various ways to solve such mixture problems. You can find them in our comments. On our history-of-mathematics channel, however, it is the old methods that interest us. What does L. F. Magnitsky’s method suggest?

Draw a diagram shaped like a fish.

Write the values for the substances in the available solutions (percentage content, concentration or cost) one below the other. To their left, halfway between them, write the value for the mixture you want to obtain.

Connect the numbers with straight lines. For each pair, subtract the smaller number from the larger one and write the result at the end of the corresponding broken line, in the fish’s tail. The resulting mass proportions show the ratio in which the original solutions should be mixed. Set up a proportion and solve it.

{% include article-figure.html id="fig-2" %}

For the wine-mixing problem, the solution looks like this.

Write the prices of the two kinds of wine and the price of the mixture in the fish’s head.

Calculate the gain, 7 − 6 = 1, and the loss, 10 − 7 = 3, on each bucket, and write the results along the lines in the fish’s tail.

Thus, 3 parts out of four must be the cheaper wine and 1 part the more expensive wine.

Let us give a general solution, which also explains the “fish”. Denote the amounts of the wines to be mixed by m₁ and m₂, and the prices per bucket of the first wine, the second wine and the mixture by р₁, р₂ and р respectively. Since the cost of the mixture equals the sum of the costs of its constituent portions, the following equality holds:

m₁p₁ + m₂p₂ = (m₁ + m₂)р

The ratio of the portions of the two wines is therefore:

$$
m_{1}/m_{2} = (p_{2} - p)/(p - p_{1})
$$

This is precisely the result given by the “fish” diagram described above.

{% include article-figure.html id="fig-3" %}

The diagram can also be used to solve other types of mixture and alloy problems. In those cases, р₁, р₂ and р stand for concentrations.
