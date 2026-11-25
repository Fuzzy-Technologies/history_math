---
schema_version: 1
article_id: hm-43eacbaf8dc7-en
source_work_id: hm-43eacbaf8dc7
layout: article
title: Multiplying on your fingers
authors:
  - Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-43eacbaf8dc7
description: The author shows how to multiply single-digit numbers greater than five by adding the bent-finger counts and multiplying the unbent-finger counts. The 6 × 8 example is followed by a 7 × 9 exercise, the complete algebraic explanation and a book reference.
type: note
tags:
  - Experiments
  - multiplication
  - fingers
  - Lifehacks
math: true
status: published
permalink: /publications/hm-43eacbaf8dc7-en/
rights_basis: Mansur Gilmullin
original_publication:
  outlet: Telegram · history_math
  date: '2024-09-23'
  preserve_date: true
figures:
  - id: fig-1
    path: /assets/images/hm-43eacbaf8dc7/figure-01.png
    alt: "One hand has one finger bent and the other has three; the Russian labels explain: 1 + 3 = 4 tens, 4 × 2 = 8 units, and 6 × 8 = 40 + 8 = 48"
    caption: Multiplying 6 by 8 on your fingers. Author’s diagram
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
  - id: fig-2
    path: /assets/images/hm-43eacbaf8dc7/figure-02.png
    alt: A cartoon hand giving a thumbs-up
    caption: Author’s illustration
    source: Illustration accompanying the text.
    rights_basis: Illustration accompanying the text.
preview_image: /assets/images/hm-43eacbaf8dc7/figure-01.png
cover_image: /assets/images/hm-43eacbaf8dc7/figure-01.png
---
{% include article-figure.html id="fig-1" %}

There are many ways to learn the multiplication table. Any primary-school teacher can tell you about them. But that is not quite what I am discussing today.

Suppose you know the multiplication table for numbers below 5 well, yet feel unsure when multiplying single-digit numbers greater than 5. How can your fingers help you check the answer? Let me show you.

Say we want to multiply 6 by 8. On one hand, bend as many fingers as the first factor exceeds 5: one finger, since $6-5=1$. You can think of this as counting six fingers, including the five on the other hand. On the other hand, bend as many fingers as the second factor exceeds 5: three, since $8-5=3$.

Add the bent fingers: $1+3=4$. That gives four tens, or 40.

Now multiply the numbers of unbent fingers on the two hands. The second term is $4\times2=8$.

Add the two terms to get $6\times8=40+8=48$.

Now try using your fingers to calculate $7\times9$. As always in mathematics, explain why the method works.

See the answer in Notes.

## Notes

{% include article-figure.html id="fig-2" %}

For $7\times9$, bend two fingers on one hand and four on the other. This gives $7\times9=60+3=63$.

Let us solve it in general. Suppose $a$ fingers are bent on the left hand and $b$ on the right. The factors are then $5+a$ and $5+b$, respectively, and their product is:

$(5+a)(5+b)=25+5a+5b+ab$<br>
$=10a+10b+(25-5a-5b+ab)$<br>
$=10(a+b)+(5-a)(5-b)$,

where $5-a$ and $5-b$ are precisely the unbent-finger counts on the two hands.

This way of multiplying was new to me. Perhaps you will find it useful too, as a charming little trick for children.

For curious readers, here is a book that explores similar methods in greater detail:

- I. N. Sergeev, S. N. Olekhnik and S. B. Gashkov, *Primeni matematiku* (Apply Mathematics), Moscow: Nauka, 1989, 240 pp. (in Russian).
