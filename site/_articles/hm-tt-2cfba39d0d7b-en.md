---
schema_version: 1
article_id: hm-tt-2cfba39d0d7b-en
source_work_id: tt-2cfba39d0d7b
layout: article
title: The Rule of False Position
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-2cfba39d0d7b
description: The ancient rule of false position used trial values and proportional corrections to solve equations long
  before formal symbolic algebra.
type: essay
tags:
- history_of_mathematics
- articles
- false_rule
- rule_of_false_position
- Ahmes
- Fibonacci
- Magnitsky
math: true
status: published
date: '2025-04-26'
permalink: /articles/hm-tt-2cfba39d0d7b/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-04-26'
  url: https://teletype.in/@history_math/False-Position-Method
source_url: https://teletype.in/@history_math/False-Position-Method
figures:
- id: fig-1
  path: /assets/images/hm-tt-2cfba39d0d7b/false-position-method-01.png
  alt: Illustration 1 for “The Rule of False Position”.
  caption: ''
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img1.teletype.in/files/0a/69/0a698f1f-06af-453e-8992-a7db26b68c05.png
preview_image: /assets/images/hm-tt-2cfba39d0d7b/false-position-method-01.png
cover_image: /assets/images/hm-tt-2cfba39d0d7b/false-position-method-01.png
---
{% include article-figure.html id="fig-1" %}

**The rule of false position**, or *regula falsi*, is one of the oldest methods of solving equations, appearing millennia before formal algebra. Egyptian scribes, Babylonian astronomers, and Chinese and Arab mathematicians used this algorithm. In Europe, it remained in textbooks until the early nineteenth century.

The Egyptians also considered algebraic problems reducible to linear equations in one unknown.

Problem. *A heap and its fourth part together make 15. What is the heap?*

Here is a traditional solution in the Egyptian manner.

*“Start with 4. You obtain 5. Divide 15 by 5. Multiply the result by 4.”*

This solution uses the method later called the “rule of false position”. An arbitrary value is chosen for the unknown, taking account of the numbers in the problem and trying to eliminate fractions. If the prescribed operations produce a number other than the one required, the trial “false” value and the values of its parts are corrected proportionally.

**There were two versions:**

1. Single false position: substitute a convenient number for the unknown, then scale the result. It was already used in ancient Egypt.
2. Double false position: substitute two numbers, compare their errors, and obtain the exact solution through a weighted combination. It arose in late antiquity.

Let us consider the simpler rule of single false position. It resembles modern linear interpolation, but without formal equation notation.

## Historical mentions of the rule {#section-1}

- In the Papyrus of Ahmes, an Egyptian mathematics textbook from around 1650 BCE, 15 problems are solved by this method.
- The Babylonians used similar approaches for astronomical calculations, but without systematising them.
- In the Chinese *Nine Chapters on the Mathematical Art* (second century BCE), the method is called “Excess and Deficit” and is used for problems such as:  
  *“If each person has 5 coins, 15 remain; if each has 6, there is a shortage of 4. How many people are there?”*
- Indian mathematicians called it *ishta karman* and passed it to the Arabs, who renamed it the “rule of the balance pans”.  
  The rule of the balance ran as follows: *“Draw a balance and write above its fulcrum the result obtained by performing the operations specified in the problem on the unknown number. Write the two false positions above the pans, the errors of excess below the balance, and the errors of deficit above it. Cross-multiply the false positions and errors. Take the difference of the products if the errors lie on the same side of the balance, and their sum if they lie on opposite sides.”*
- Leonardo of Pisa, or Fibonacci, described the rule in *Liber Abaci* (1202) using a problem about a tree's height:  
  *“Find the height of a tree whose underground part, measuring 21 spans, is one-third plus one-quarter of its height.”* Take 12 as the trial height, convenient for division by 3 and 4. The underground part then equals 7. 21:7 = 3. 12 × 3 = 36, the tree's height.
- In Russia, the method appeared in the seventeenth century through Arabic sources. In his *Arithmetic* (1703), Leonty Magnitsky called it the “false rule” and devoted an entire section to it: “On False or Conjectural Rules”.

## A problem for the “false” rule {#section-2}

Let us solve a problem from L. F. Magnitsky's *Arithmetic* using the “false” rule.

*Someone asked a teacher, “How many pupils are in your class? I wish to send my son to study with you.” The teacher replied, “If as many pupils as I have now came again, and half as many, and a quarter as many, and your son, I would have 100 pupils.”*

## Solution {#section-3}

**1)** Make a first assumption: suppose there were 24 pupils.

The problem tells us to add “as many, half as many, a quarter as many, and 1” to this number. We would therefore have:

24 + 24 + 12 + 6 + 1 = 67, which is 100 − 67 = 33 fewer than required. Call 33 the “first error”.

**2)** Make a second assumption: there were 32 pupils. We would then have:

32 + 32 + 16 + 8 + 1 = 89, which is 100 − 89 = 11 fewer. This is the “second error”.

If both assumptions give too little, the rule is: multiply the first assumption by the second error and the second assumption by the first error, subtract the smaller product from the larger, and divide the difference by the difference between the errors:

$$
(32 \times  33 - 24 \times  11)/(33 - 11) = 792/22 = 36
$$

**Answer:** there were 36 pupils.

Of course, it is much easier to solve the problem algebraically using the equation 2x + x/2 + x/4 + 1 = 100.

Use the same rule if both assumptions give more than the problem requires. If one gives more and the other less, use sums rather than differences in the calculations described above.

Solving a problem with the “false” rule takes much longer than solving it with equations.

## Where the “simple rule” comes from {#section-4}

Suppose a problem reduces to the equation ax = b. Choose a false value x = x₁ and calculate ax₁ = b₁. The solution of the original equation is then x = (b/b₁)x₁.

Let us explain the “double rule” by solving a linear equation:

$$
ax = b   (1)
$$

Let the “first false position” be x = x₁. Substituting x₁ into the equation gives:

$$
ax_{1} = b + n_{1}   (2)
$$

where n₁ is the first error on the right-hand side. It may be negative.

Now let the “second false position” be x = x₂. We obtain:

$$
ax_{2} = b + n_{2}   (3)
$$

where n₂ is the second error on the right-hand side.

Subtract equation (3) from equation (2), term by term:

$$
a(x_{1} - x_{2}) = n_{1} - n_{2}   (4)
$$

Multiply both sides of equation (2) by x₂ and both sides of equation (3) by x₁, then subtract the resulting equations term by term:

$$
b(x_{2} - x_{1}) + (n_{1}x_{2} - n_{2}x_{1}) = 0   (5)
$$

Find a from equation (4) and b from equation (5). Since the original equation (1) gives x = b/a, we obtain:

$$
x = (n_{1}x_{2} - n_{2}x_{1}):(n_{1} - n_{2})
$$

This is the solution of equation (1) using “false positions”.

By the nineteenth century, algebraic methods had displaced the rule of false position. The formulas of Viète and Descartes made notation more compact.

Interestingly, the idea reappeared in twentieth-century numerical methods as the “secant method” for solving equations approximately.

The rule of false position is a bridge between the empirical mathematics of antiquity and the rigorous algebra of the early modern period. It shows how practical problems led to abstract methods. Today it is studied as a historical technique, yet it was techniques like these that laid the foundations of modern algebra.
