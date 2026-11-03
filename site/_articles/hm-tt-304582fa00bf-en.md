---
schema_version: 1
article_id: hm-tt-304582fa00bf-en
source_work_id: tt-304582fa00bf
layout: article
title: 'Calculating Capital Doubling Time: The Rule of 72'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-304582fa00bf
description: "The Rule of 72 estimates how long a deposit takes to double by dividing 72 by the annual percentage rate. Its connection with compound interest explains the approximation and its use for other processes of exponential growth and decay."
type: essay
tags:
- Life hacks
- Rule of 72
- Compound interest
math: true
status: published
date: '2023-09-09'
permalink: /articles/hm-tt-304582fa00bf/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-30; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2023-09-09'
  url: https://teletype.in/@history_math/Vychislenie-vremeni-udvoeniya-kapitala-Pravilo-72-09-09
source_url: https://teletype.in/@history_math/Vychislenie-vremeni-udvoeniya-kapitala-Pravilo-72-09-09
figures:
- id: fig-1
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
  alt: 'Illustration 1 for “Calculating Capital Doubling Time: The Rule of 72”'
  caption: ''
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/87/fe/87fe2f0d-baba-4573-9995-4afeb0422a4a.png
- id: fig-2
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-02.png
  alt: Derivation of the empirical Rule of 72
  caption: Derivation of the empirical Rule of 72
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/01/83/0183f865-e211-4c4d-9c87-2f20eede7492.png
- id: fig-3
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-03.png
  alt: Portrait of Luca Pacioli (1445–1517), attributed to Jacopo de’ Barbari, 1495
  caption: Portrait of Luca Pacioli (1445–1517), attributed to Jacopo de’ Barbari, 1495
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/98/4d/984de790-0617-4eea-876f-ece9c679f434.png
preview_image: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
cover_image: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
---
{% include article-figure.html id="fig-1" %}

People enter the stock market and buy shares, bonds and other assets. First, though, they need to set a goal and calculate how long it will take to reach it.

Want a quick way to find how long a deposit at a given interest rate will take to double? You do not need a calculator: knowing the Rule of 72 is enough. Divide 72 by the interest rate to obtain the approximate time until the deposit doubles.

For example, a deposit earning 5% a year will take a little over 14 years to double.

This empirical rule, T=72/r, gives an approximate estimate of the time T in which a quantity doubles when it grows steadily at a percentage rate r. Its derivation applies the compound-interest formula and simplifies it under certain assumptions.

{% include article-figure.html id="fig-2" %}

The names “Rule of 69”, “Rule of 70” and “Rule of 72” may all be used. The number 72 is divisible by 2, 3, 4, 6, 8, 9, 12 and 18, making it possible to calculate many standard interest rates mentally. It is treated as an approximation to 100ln2 = 69,3. In other words, dividing 69 by the percentage rate is more accurate, but the integer 70 is easier to remember. Replacing 69,3 with 72 introduces an error of approximately 3% in the result. The number 72 gives its best results for rates between 5% and 10% a year.

The Rule of 72 can estimate not only the growth of money but any other process described by an exponential relationship. The time need not be measured in years: the coefficient r simply has to describe the change over the same unit of time as that used to measure the doubling period T.

Nor does the quantity have to increase: it may decrease by r percent per unit of time. In that case, the estimate is for the time it takes to halve rather than double.

{% include article-figure.html id="fig-3" %}

The first mention of the rule appears in Luca Pacioli's (1445–1517) mathematical treatise Summa de arithmetica, geometria, proportioni et proportionalita (1494).

**Examples**

1. Estimate how long it will take prices to double through inflation if they increase by r percent a year.

2. Over a millennium, the amount of radioactive material in an ingot falls by r percent. How long will it take for the amount of radioactive material to halve? (The law of radioactive decay.)
