---
schema_version: 1
article_id: hm-tt-16b5a4e33afd-en
source_work_id: tt-16b5a4e33afd
layout: article
title: 'The Mediant of Two Fractions: The Freshman''s Sum'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-16b5a4e33afd
description: The mediant combines numerators and denominators and explains practical averages in sport, travel,
  trade and mixtures.
type: essay
tags:
- History of mathematics
- Mediant
- Khinchin
- Kline
- Football
- Speed
- Concentration
- Trade
math: true
status: draft
date: '2026-04-21'
permalink: /articles/hm-tt-16b5a4e33afd/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2026-04-21'
  url: https://teletype.in/@history_math/medianta-dvuh-drobei
source_url: https://teletype.in/@history_math/medianta-dvuh-drobei
figures:
- id: fig-1
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-01.png
  alt: Illustration of the freshman’s sum
  caption: Illustration of the freshman’s sum
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6b/e5/6be57bf8-b2b9-45bb-bad0-5a91fb1bc003.png
- id: fig-2
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-02.jpeg
  alt: Aleksandr Yakovlevich Khinchin (1894–1959), founder of the Soviet school of probability theory
  caption: Aleksandr Yakovlevich Khinchin (1894–1959), founder of the Soviet school of probability theory
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/0b/fe/0bfe7903-0d65-4ea7-9f4e-69d3861837d7.jpeg
- id: fig-3
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-03.jpeg
  alt: Morris Kline (1908–1992)
  caption: Morris Kline (1908–1992)
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/bc/ea/bcea6b2f-674f-4b83-901e-9155e29d8ddc.jpeg
- id: fig-4
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-04.png
  alt: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Football”'
  caption: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Football”'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/e6/a3/e6a392f9-3031-4e52-812a-c21fab28c896.png
- id: fig-5
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-05.png
  alt: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Speed”'
  caption: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Speed”'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2f/17/2f17c8c8-c791-41bf-ae8e-937f381ac766.png
- id: fig-6
  path: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-06.png
  alt: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Trade”'
  caption: 'M. Kline, Mathematics: The Loss of Certainty, p. 111, “Trade”'
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/fe/dd/fedd3e22-5ae6-4ddf-8af6-5c8a17972674.png
preview_image: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-01.png
cover_image: /assets/images/hm-tt-16b5a4e33afd/medianta-dvuh-drobei-01.png
---
{% include article-figure.html id="fig-1" %}

In mathematics, the **mediant of two fractions** a/b and c/d is a new fraction whose numerator is the sum of the original numerators and whose denominator is the sum of the original denominators:

$$
a/b ⊕ c/d = (a + c) / (b + d)
$$

Of course, ordinary arithmetic does not add fractions this way. That is why this operation is sometimes jokingly called the “freshman's sum”; let us denote it by **⊕**. Curiously, this apparent mistake is far from meaningless. In a number of problems it is a natural and useful computational technique.

The word “mediant” comes from French médiante and literally means something in the middle or intermediate.

A. Ya. Khinchin introduced the concept of the mediant of two fractions in the theory of continued fractions. It helped clarify the relative positions of fractions and the algorithm for constructing intermediate fractions alongside convergents.

{% include article-figure.html id="fig-2" %}

[**Aleksandr Yakovlevich Khinchin**](https://t.me/history_math/171) (1894–1959) was an outstanding Soviet mathematician and one of the founders of the Soviet school of probability theory. His name is associated with more than probability: he also made substantial contributions to number theory and continued fractions.

The mediant has a remarkable property. If two fractions have positive denominators and one is less than the other, their mediant lies strictly between them.

**If a/b < c/d, then a/b < (a + c) / (b + d) < c/d.**

This simple but beautiful property is easy to prove algebraically. It already explains why the mediant plays such an important role in constructing intermediate fractions.

Interestingly, the American mathematician and historian of mathematics Morris Kline approached the mediant from another direction. In Mathematics: The Loss of Certainty, he effectively draws fresh attention to this operation, presenting a distinctive “new arithmetic” of fractions through practical examples.

{% include article-figure.html id="fig-3" %}

**Morris Kline** (1908–1992) was an American mathematician known for his work on the history and philosophy of mathematics, mathematics education and popular-science writing. He was a professor at New York University for many years.

In his book Kline writes:

> *“It is not only the properties of whole numbers that fail to describe many physical situations; in practice, a quite different arithmetic of fractional numbers is often needed.”*

{% include article-figure.html id="fig-4" %}

One of the clearest examples comes from football. If a player takes three shots at goal in one match and scores twice, their scoring rate is 2/3. If they score 3 goals from 4 shots in the second match, it is 3/4.

The average scoring rate over the two matches is calculated by dividing the total number of goals by the total number of shots, rather than adding the fractions by the school rule. It is the mediant of the fractions:

$$
2/3 ⊕ 3/4 = (2 + 3) / (3 + 4) = 5/7
$$

This is entirely natural and logical: what is added is not the fractions themselves but the real quantities behind them, goals and shots. The result 5/7 therefore makes sense in this context, whereas 17/12, obtained by ordinary addition of 2/3 and 3/4, has no connection with the average scoring rate.

{% include article-figure.html id="fig-5" %}

A similar situation arises when calculating average speed over two sections of a journey. If a car covers distances S₁ and S₂ in times t₁ and t₂, its average speed for the whole journey is

$$
V = S_{1}/t_{1} ⊕ S_{2}/t_{2} = (S_{1} + S_{2}) / (t_{1} + t_{2})
$$

and is again determined by the mediant rule for the corresponding fractions S₁/t₁ and S₂/t₂.

{% include article-figure.html id="fig-6" %}

The same reasoning applies in trade. If 3 out of 5 visitors make purchases on the first day, and 4 out of 7 on the second, the overall effectiveness for the two days is not the arithmetic sum of 3/5 and 4/7, but the ratio of the total number of purchases to the total number of visitors:

$$
(3 + 4) / (5 + 7) = 7/12
$$

Here too the mediant is at work.

Solutions offer an even clearer example. Mixing two salt solutions, one at a concentration of 10% and the other at 20%, cannot produce a concentration of 30%. The final concentration must lie between the initial values.

If k₁ = x₁/m₁ and k₂ = x₂/m₂ are the concentrations of two solutions, where x₁ and x₂ are the masses of salt and m₁ and m₂ the masses of the solutions, then the mixture's concentration is

$$
k = (x_{1} + x_{2}) / (m_{1} + m_{2})
$$

This is again a mediant. The masses of dissolved salt and the masses of the solutions are literally added. That is why the result is intermediate.

This viewpoint is useful in teaching. It shows that an “incorrect operation” can become “correct” when the problem itself changes. The mediant illustrates how mathematics teaches us to understand the meaning of a calculation, beyond mechanically applying formulas.

The mediant is also connected with the [**Farey sequence**](https://teletype.in/%40history_math/Farey-sequence), discussed in an earlier blog article. Starting with two fractions and repeatedly inserting mediants between neighbouring fractions produces a beautiful family of rational numbers connected with approximation, the ordering of fractions and number theory.

Finally, the word “mediant” exists outside fraction arithmetic. In music it names one of the tonal functions in the major–minor system. In French culinary tradition, médiants are small chocolate discs with nuts and dried fruit: literally one-bite sweets.

Such is the story of an operation that seems strange at first. In a school exercise book it may look like a mistake, yet in a broader mathematical and practical context it becomes a meaningful tool. As often happens, a small formula unexpectedly reveals a whole network of connections: continued fractions, applied calculations, Farey sequences and even musical terminology.

📚 [Mathematics with Mansur-abyy](https://t.me/history_math)
