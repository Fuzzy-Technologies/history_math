---
schema_version: 1
article_id: hm-1aa755de3ee4-en
source_work_id: hm-1aa755de3ee4
layout: article
title: ✌️ Magnitsky’s mathematical amusements
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-1aa755de3ee4
description: "An amusement from Magnitsky’s Arithmetic turns finding a player’s ring into a sequence of calculations. Subtracting 250 reveals three digits: the person, finger and joint numbers."
type: problem
tags:
  - Problems
  - History of Mathematics
  - Magnitsky
  - amusements
  - arithmetic
math: true
status: draft
permalink: /publications/hm-1aa755de3ee4-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2025-12-05'
  preserve_date: true
  url: https://t.me/history_math/789
source_url: https://t.me/history_math/789
figures:
  - id: fig-1
    path: /assets/images/hm-1aa755de3ee4/figure-01.png
    alt: A line drawing of an open palm with a ring on the ring finger
    caption: A hand with a ring. Author’s illustration
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-1aa755de3ee4/figure-01.png
cover_image: /assets/images/hm-1aa755de3ee4/figure-01.png
---
{% include article-figure.html id="fig-1" %}

In Leonty Magnitsky’s [*Arithmetic*](https://rusneb.ru/catalog/000199_000009_004091683/), mathematical amusements have their own section, “On Certain Entertaining Operations Performed through Arithmetic”. Magnitsky explains that he included them for amusement and especially to sharpen pupils’ minds, although he considered the problems themselves optional.

## The first amusement

In a modern retelling, one of eight people takes a ring and puts it on a particular joint of a finger. The challenge is to find who has it, on which finger and at which joint.

The rules work for any group of up to nine people.

Did you know that every finger except the thumb has three joints? For this game, use the eight fingers, leaving out both thumbs.

To avoid confusion, agree on the same numbering for everyone:

- People: number the players from 1, going round the circle or from left to right.
- Fingers: 1–4 on one hand, from index to little finger, and 5–8 on the other, excluding thumbs.
- Joints: 1 at the base, 2 in the middle, 3 nearest the nail.

Suppose person 4 has the ring on finger 5 at joint 2.

Magnitsky gives this method. The guesser, who may turn away, asks someone to perform the following operations on paper without saying the intermediate numbers aloud:

1. Double the number of the person with the ring: $4\times2=8$.
2. Add 5: $8+5=13$.
3. Multiply by 5: $13\times5=65$.
4. Add the finger number: $65+5=70$.
5. Multiply by 10: $70\times10=700$.
6. Add the joint number: $700+2=702$.

Tell the guesser the result. They simply subtract 250: $702-250=452$.

Read the digits from left to right: person 4, finger 5, joint 2.

So the ring is with person 4, on finger 5, at joint 2.

Try writing out and explaining the trick yourself!

## Solution: why it works

The explanation is simple. The operations place the three numbers in the hundreds, tens and units positions. That is the whole secret.

Let the ring be with person $a$, on finger $b$, at joint $c$. Repeat the operations symbolically:

1. $2\times a=2a$.
2. $2a+5$.
3. $5(2a+5)=10a+25$.
4. $10a+25+b$.
5. $10(10a+25+b)=100a+250+10b$.
6. $100a+10b+250+c$.
7. Subtract 250: $100a+10b+250+c-250=100a+10b+c$.

The hundreds digit is $a$, the person number; the tens digit is $b$, the finger number; and the units digit is $c$, the joint number.

## Notes

Why no more than nine people? All three numbers, $a,b,c$, must be single digits so that they fit correctly in the hundreds, tens and units positions.

The problem is discussed in popular mathematics books.

- I. Ya. Depman, [*Rasskazy o matematike*](https://ru.djvu.online/file/ZRcCu2CY74jqh) (Stories about Mathematics), 1954, pp. 67–68 (in Russian).
- N. Ya. Vilenkin and I. Ya. Depman, *Za stranitsami uchebnika matematiki* (Beyond the Pages of the Mathematics Textbook), a guide for pupils in grades 5–6, second edition, Moscow: Mnemozina, 2020, 256 pp. (in Russian).
