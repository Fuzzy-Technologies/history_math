---
schema_version: 1
article_id: hm-tt-9decb3410914
source_work_id: tt-9decb3410914
layout: article
title: Задача о гадании на травах
authors:
  - Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-9decb3410914
description: «По преданию, когда-то в сельских местностях России среди девушек
  существовало такое гадание на травах. Одна из подруг зажимала в руке...
type: problem
tags:
  - историяматематики
  - задачи
  - вероятность
  - гадание
  - травы
math: true
status: published
date: '2025-02-02'
permalink: /ru/articles/hm-tt-9decb3410914/
rights_basis: Owner-requested migration of the author's complete Teletype
  publication on 2026-10-11; editorial publication approved by Tim55667757; owner approval recorded; no
  new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-02-02'
  url: https://teletype.in/@history_math/Solving-the-Herb-Divination-Puzzle
source_url: https://teletype.in/@history_math/Solving-the-Herb-Divination-Puzzle
figures:
  - id: fig-1
    path: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
    alt: Картина С. Л. Кожина «Иван Купала. Гадание на венках» (2009)
    caption: Картина С. Л. Кожина «Иван Купала. Гадание на венках» (2009)
    source: Архив иллюстраций исходной статьи в Teletype.
    credit: ''
    rights_basis: Original image bytes from the owner-supplied Teletype archive,
      migrated at the owner request; original attribution retained; no new
      license asserted.
    source_url: https://img4.teletype.in/files/b0/0c/b00c1cbf-5fa6-4e62-a422-bcc0b71dd11c.jpeg
  - id: fig-2
    path: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-02.png
    alt: Схематичное пошаговое решение задачи о травинках
    caption: Схематичное пошаговое решение задачи о травинках
    source: Архив иллюстраций исходной статьи в Teletype.
    credit: ''
    rights_basis: Original image bytes from the owner-supplied Teletype archive,
      migrated at the owner request; original attribution retained; no new
      license asserted.
    source_url: https://img3.teletype.in/files/ed/7c/ed7cf71a-9fe1-4034-a27b-272f4770d82a.png
preview_image: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
cover_image: /assets/images/hm-tt-9decb3410914/solving-the-herb-divination-01.jpeg
---
{% include article-figure.html id="fig-1" %}

«По преданию, когда-то в сельских местностях России среди девушек существовало такое гадание на травах. Одна из подруг зажимала в руке шесть травинок так, чтобы концы травинок торчали сверху и снизу, а другая связывала эти травинки попарно между собой, сначала верхние, а потом нижние концы. Если при этом все шесть травинок оказывались связанными в одно кольцо, то это должно было означать, что девушка в текущем году выйдет замуж».

Ну, а теперь превратим эту легенду в полноценную задачу по теории вероятностей!

{% include article-figure.html id="fig-2" %}

Какова вероятность того, что шесть травинок (1) при их случайном связывании образуют кольцо?

**Примечание.** Кольца могут и не получиться. А может оказаться несколько колец (2): одно, два или три. Нас интересует только тот случай, когда получается одно большое кольцо.

Приведём одно из решений (смотрите пошаговую схему).

С одной стороны (3) травинки можно завязать как угодно. При этом кольца не образуются.

Посмотрим на другую сторону. Выберем любой из свободных концов. Его можно связать с любым из оставшихся пяти. В одном случае сразу получится замкнутое кольцо (4), оно нам не подходит. Подходит один из четырёх концов.

Осталось четыре свободных конца (5). Выбираем один конец. Связываем с одним из трёх оставшихся. При этом только один из трёх не подходит, так как получается малое кольцо из четырёх травинок (6). В двух случаях из трёх получатся подходящие соединения (7).

Если свяжутся оставшиеся два конца, то получится одно большое кольцо (8).

Таким образом, для нахождения вероятности получения желаемого результата, надо перемножить 4/5 и 2/3, то есть получается 8/15.

**Ответ:** 8/15. Значит, девушка выйдет замуж с вероятностью чуть больше 1/2!

Попробуйте решить аналогичную задачу для десяти травинок.






