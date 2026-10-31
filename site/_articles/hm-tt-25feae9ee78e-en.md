---
schema_version: 1
article_id: hm-tt-25feae9ee78e-en
source_work_id: tt-25feae9ee78e
layout: article
title: 'A Seventeenth-Century Battle of Wits: Winning the Game of 100'
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-25feae9ee78e
description: "In Bachet's game from his 1612 collection, players add numbers from 1 to 10 to a running total, aiming to reach 100 first. The first player guarantees victory by opening with 1 and then making each pair of moves add up to 11."
type: problem
tags:
- history_of_mathematics
- problems
- Bachet
- game
- strategy
- winning
math: true
status: draft
date: '2025-03-09'
permalink: /articles/hm-tt-25feae9ee78e/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-03-09'
  url: https://teletype.in/@history_math/Mind-game-from-the-17th-century
source_url: https://teletype.in/@history_math/Mind-game-from-the-17th-century
figures:
- id: fig-1
  path: /assets/images/hm-tt-25feae9ee78e/mind-game-from-the-17th-cent-01.jpeg
  alt: Claude Gaspard Bachet de Méziriac (1581–1638).
  caption: Claude Gaspard Bachet de Méziriac (1581–1638).
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/76/0e/760e9c0d-857a-4c4e-95cd-20eed6e2272a.jpeg
- id: fig-2
  path: /assets/images/hm-tt-25feae9ee78e/mind-game-from-the-17th-cent-02.jpeg
  alt: The cover of an edition of Diophantus's Arithmetica in Bachet de Méziriac's Latin translation.
  caption: The cover of an edition of Diophantus's Arithmetica in Bachet de Méziriac's Latin translation.
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/50/9b/509b5dc3-50ba-4636-9b44-b86ea33ac145.jpeg
preview_image: /assets/images/hm-tt-25feae9ee78e/mind-game-from-the-17th-cent-01.jpeg
cover_image: /assets/images/hm-tt-25feae9ee78e/mind-game-from-the-17th-cent-01.jpeg
---
{% include article-figure.html id="fig-1" %}

In 1612, the French poet, mathematician and translator Claude Gaspard Bachet de Méziriac (1581–1638) published a collection entitled *Amusing and Delightful Mathematical Problems* (*Problèmes plaisants et délectables*).

Among its game problems was a simple but profound one: *two players take turns naming numbers from 1 to 10, and the winner is the first to bring the total of the numbers named by both players to 100*.

This game entertained aristocrats and also laid the foundations of the theory of strategies, 400 years before John Nash (*A Beautiful Mind*) and his “equilibrium law” in game theory.

Let us play together. As always in mathematical game theory, we add a question: what should the winning strategy be, if one exists?

## Solution {#section-1}

The first player has a winning strategy.

They begin with 1. Then, for each number named by the second player, they name its partner so that the pair sums to 11. Such a partner always exists and is unique: 1 + 10, 2 + 9, 3 + 8, 4 + 7, 5 + 6. The first player controls the game.

After each successive move by the first player, the “key” totals are therefore 1, 12, 34, 45, 56, 67, 78, 89, 100. The first player wins, and the second player cannot prevent it. (The second player can win only if the first makes a mistake at some stage. The second can then reach the key totals themselves.)

Bachet recommended starting with 1 only when the target total was 100. In effect, this is a strategy based on modular arithmetic.

Try finding a winning strategy for another version of the game:

*“The player who starts says 1 or 2. The players then take turns naming numbers, adding 1 or 2 to the previous number. Whoever says 20 wins.”*

## Historical background {#section-2}

Bachet de Méziriac knew several languages, including Latin, Greek, Hebrew, Italian and Spanish. He wrote poetry in French, Italian and Latin. He first taught at a Jesuit college in Milan. He translated Latin poets and Greek mathematicians, and was one of the first members of the French Academy (1635).

{% include article-figure.html id="fig-2" %}

His 1621 publication of Diophantus's *Arithmetica* in Greek and in his own Latin translation, with extensive commentary, attracted enormous interest in the scholarly world. This translation became a constant companion and a source of new discoveries for Pierre de Fermat and other outstanding seventeenth-century mathematicians. It was in the margins of this book that Fermat wrote the statement of his Last Theorem.

The problem appears in several collections of historical and recreational problems, for example:

1. Bavrin, I. I. *A Collection of Problems and Entertaining Exercises in Mathematics, Grades 5–9*. Moscow: VLADOS, 2013. 236 pp.
2. Dahl, K. *Understandable Mathematics with Kristin Dahl and Sven Nordqvist*. Moscow: Belaya Vorona, 2017. 64 pp.

## Note {#section-3}

Where else is Bachet's algorithm used?

Bachet's problem is an example of a game in which an optimal strategy exists and can be calculated: a deterministic strategy.

Bachet's strategy formed the basis of a class of mathematical games in which players take turns removing objects from heaps.

Minimax algorithms used in chess and Go go back to Bachet's idea of “winning positions”.

In cryptography, modular arithmetic, as in the strategy based on 11, is used in RSA encryption.

In psychology and education, this method is used to teach children patterns and critical thinking.
