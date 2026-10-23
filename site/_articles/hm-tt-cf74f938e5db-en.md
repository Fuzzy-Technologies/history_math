---
schema_version: 1
article_id: hm-tt-cf74f938e5db-en
source_work_id: tt-cf74f938e5db
layout: article
title: What Is Life? A Game!
authors:
- Mansur Gilmullin
author: Mansur Gilmullin
lang: en
translation_key: hm-tt-cf74f938e5db
description: John Horton Conway’s Game of Life uses simple cellular-automaton rules to generate a remarkable diversity
  of patterns, attracting researchers and enthusiasts for decades.
type: essay
tags:
- History of mathematics
- Conway
- Game of Life
- game_of_life
- conway
math: true
status: published
date: '2024-10-26'
permalink: /articles/hm-tt-cf74f938e5db/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by Tim55667757; owner approval recorded; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-10-26'
  url: https://teletype.in/@history_math/Conway-Game-of-Life
source_url: https://teletype.in/@history_math/Conway-Game-of-Life
figures:
- id: fig-1
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-01.png
  alt: Andrey Mironov as Ostap Bender in the film The Twelve Chairs, based on the novel of the same name by Ilya
    Ilf and Yevgeny Petrov
  caption: Andrey Mironov as Ostap Bender in the film The Twelve Chairs, based on the novel of the same name by
    Ilya Ilf and Yevgeny Petrov
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/74/bc/74bc8086-1e59-4e6a-a1d8-3c7dbf8981f9.png
- id: fig-2
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-02.png
  alt: John Horton Conway (1937–2020), British mathematician
  caption: John Horton Conway (1937–2020), British mathematician
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/38/e5/38e5f04b-ab6f-481c-b944-a22c03a99530.png
- id: fig-3
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-03.png
  alt: The author once explored configurations in Evolution–Life too, while explaining the rules to his school-aged
    son :)
  caption: The author once explored configurations in Evolution–Life too, while explaining the rules to his school-aged
    son :)
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img4.teletype.in/files/b9/06/b906f04c-c51f-429a-a5c5-d4649514897b.png
- id: fig-4
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-04.gif
  alt: A diagrammatic glider on a 10 × 10 square grid with periodic boundary conditions
  caption: A diagrammatic glider on a 10 × 10 square grid with periodic boundary conditions
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d6/47/d647ada7-0ed9-4d14-8aeb-76e9187dfd2a.gif
- id: fig-5
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-05.png
  alt: An example of a Garden of Eden in the Game of Life
  caption: An example of a Garden of Eden in the Game of Life
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img3.teletype.in/files/61/62/6162f4b8-dbcf-4856-b582-76266028dfd3.png
- id: fig-6
  path: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-06.png
  alt: You can experiment with different initial configurations for the Game of Life at ConwayLife.com
  caption: You can experiment with different initial configurations for the Game of Life at ConwayLife.com
  source: Illustration archive of the original Teletype article.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original
    attribution retained; no new license asserted.
  source_url: https://img2.teletype.in/files/14/0e/140e0b72-c55c-4f7c-a24d-e678796ab40b.png
preview_image: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-01.png
cover_image: /assets/images/hm-tt-cf74f938e5db/conway-game-of-life-01.png
---
{% include article-figure.html id="fig-1" %}

John Horton Conway (1937–2020), the British mathematician, is known among nonmathematicians primarily as the creator of the Game of Life, although his contributions to mathematics were diverse and substantial. Conway said he had never worked a day in his life: he had always simply played games.

{% include article-figure.html id="fig-2" %}

The Game of Life is a cellular automaton devised by Conway in 1970. From childhood, he was interested in cellular automata, particularly John von Neumann’s automaton. His and his friends’ efforts were rewarded when they devised what became the Game of Life. Conway outlined its basic rules in a letter to Martin Gardner (1970). Gardner wrote about it in his Scientific American column, and the piece became the most popular ever to appear there. Life gained thousands of enthusiasts across America and beyond, while its inventor became known to the wider public.

The first Russian-language mention of the Game of Life dates to 1971. In the translation in *Science and Life*, it was called “Evolution”.

{% include article-figure.html id="fig-3" %}

Life uses simple rules but generates a great diversity of “life forms”. It is a game without players, since the player takes no active part. They create the initial state by placing counters, then simply observe its development.

- The game takes place on a plane divided into cells, which may be unbounded, bounded or closed; this field is sometimes called the “universe”.
- Each cell has eight surrounding neighbours and can be in two states: “alive” (occupied) or “dead” (empty).
- The initial distribution of live cells is called the first generation. Each subsequent generation is calculated from the preceding one through simple but carefully chosen rules, analogous to “genetic laws”:
  - a dead (empty) cell with exactly three live neighbours becomes alive;
  - a live cell with two or three live neighbours survives into the next generation;
  - otherwise, if it has fewer than two or more than three live neighbours, the cell dies, from “isolation” or “overpopulation”.
- The game stops if:
  - no live cells remain on the field;
  - a configuration exactly repeats one from an earlier step, without any shift or rotation, forming a periodic configuration;
  - no cell changes its state at the next step, forming a stable configuration.

Conway thus found rules under which the “colony’s” behaviour in any configuration was unpredictable, while following precise rules.

Despite the rules’ simplicity, an enormous variety of forms can arise. A glider, for example, is a five-cell configuration capable of moving across the two-dimensional field.

{% include article-figure.html id="fig-4" %}

A Garden of Eden is an arrangement of cells that can have no preceding generation.

{% include article-figure.html id="fig-5" %}

Turing-complete processes can be created in the game, allowing any Turing machine to be implemented.

A community of enthusiastic researchers formed around Life. It still exists and exchanges information on new discoveries, for example at [ConwayLife.com](https://ConwayLife.com).

We invite you to try the rules of Life yourself: create colonies of three points and observe their existence and development. Try drawing the successive stages of a colony on squared paper, step by step, following the rules above. If doing this by hand proves difficult, experiment with different initial configurations automatically at [ConwayLife.com](https://ConwayLife.com).

{% include article-figure.html id="fig-6" %}

Although the game consists of only two simple stages, or rules, it has attracted scientists for more than fifty years. Life and its modifications have influenced many branches of exact science, including mathematics, computer science and physics. Its influence can be found in automata theory, algorithm theory, game theory, graph theory, programming, statistics, combinatorics and fractal geometry.

Other sciences also intersect with Life’s phenomena: biology, chemistry, astronomy, nanomechanics and electrical engineering.

Conway later almost lost interest in his game. He was unhappy that Life was so much better known than his other work and was reluctant to talk about it.

He invented many other games, including Sprouts, Phutball and Hackenbush.

In 2015, Siobhan Roberts’s biography of Conway, *Genius at Play: The Curious Mind of John Horton Conway*, appeared. We also recommend:

- *Science and Life*, no. 8, 1971, pp. 130–133.
- Gardner, M. *Tic-Tac-Toe*. Moscow: Mir, 1988. pp. 287–343.
- Gardner, M. *Mathematical Recreations*. Moscow: Mir, 1972. pp. 458–488.
- *The Man Who Played with Mathematics: A Collection in Memory of John Conway*. Translated from English by B. R. Frenkin. MCCME, 2023.
