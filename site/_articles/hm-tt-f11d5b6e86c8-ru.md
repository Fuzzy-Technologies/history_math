---
schema_version: 1
article_id: hm-tt-f11d5b6e86c8
source_work_id: tt-f11d5b6e86c8
layout: article
title: Головоломка «Ревнивые мужья на переправе»
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-f11d5b6e86c8
description: Переправа, переправа! Берег левый, берег правый...
type: essay
tags:
- историяматематики
- опыты
- ревнивые_мужья
- головоломка
- перевозки
math: true
status: published
date: '2024-12-01'
permalink: /ru/articles/hm-tt-f11d5b6e86c8/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-30; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-12-01'
  url: https://teletype.in/@history_math/crossing
source_url: https://teletype.in/@history_math/crossing
figures:
- id: fig-1
  path: /assets/images/hm-tt-f11d5b6e86c8/crossing-01.jpeg
  alt: Картина Томаса Брукса (1818–1891) «Дочь-паромщика» (Thomas Brooks, The Ferryman's Daughter), 1869. Холст, масло. Хранится
    в галерее Борна, в частной коллекции
  caption: Картина Томаса Брукса (1818–1891) «Дочь-паромщика» (Thomas Brooks, The Ferryman's Daughter), 1869. Холст, масло.
    Хранится в галерее Борна, в частной коллекции
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d5/9a/d59a1ad0-7d3d-4a4e-b9f5-f138ceba6eb1.jpeg
- id: fig-2
  path: /assets/images/hm-tt-f11d5b6e86c8/crossing-02.jpeg
  alt: 'Головоломка о волке, козе и капусте из книги Алкуина «Задачи для изощрения ума юношей»: «Один человек должен был перевезти
    через реку волка, козу и кочан капусты. И не удалось ему найти другого судна, кроме как такого, которое могло выдержать
    только двоих из них. Задача, таким об'
  caption: 'Головоломка о волке, козе и капусте из книги Алкуина «Задачи для изощрения ума юношей»: «Один человек должен был
    перевезти через реку волка, козу и кочан капусты. И не удалось ему найти другого судна, кроме как такого, которое могло
    выдержать только двоих из них. Задача, таким образом, заключалась в том, как всех перевезти на другой берег целыми и невредимыми.
    Скажите, кто способен: каким путём они могут перебраться на другой берег невредимыми»?'
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d7/1d/d71da949-868a-4df8-9271-1c9f291530a7.jpeg
- id: fig-3
  path: /assets/images/hm-tt-f11d5b6e86c8/crossing-03.png
  alt: Схема перевозок, обеспечивающая переправу за 11 рейсов. Пары обозначены через Аа, Бб, Вв (маленькие буквы — жёны, большие
    — мужья)
  caption: Схема перевозок, обеспечивающая переправу за 11 рейсов. Пары обозначены через Аа, Бб, Вв (маленькие буквы — жёны,
    большие — мужья)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/4b/ab/4babef52-61cd-4e2c-abdb-9b66c8a84532.png
preview_image: /assets/images/hm-tt-f11d5b6e86c8/crossing-01.jpeg
cover_image: /assets/images/hm-tt-f11d5b6e86c8/crossing-01.jpeg
---
{% include article-figure.html id="fig-1" %}

> Переправа, переправа!  
> Берег левый, берег правый

> А. Твардовский

В сборниках логических задач, как старинных, так и современных, встречается много задач о переправах при определённых ограничениях. Самая известная — «Задача о волке, козе и капусте», [автором которой был Алкуин](https://t.me/history_math/341) (Флакк Альбин, лат. Alcuinus, ок. 735–804) — англо-саксонский учёный, богослов и поэт.

{% include article-figure.html id="fig-2" %}

В одном старинном русском сборнике занимательных задач есть следующая:

*«Три ревнивых мужа, пришедши с жёнами своими к берегу реки, нашли при оном лодку, в которую по её малости более двух человек вмещаться не могло. Посему спрашивается, как бы через реку переехать сим шести человекам так, чтобы ни одна жена с чужим мужем не переезжала и ни на котором берегу не оставалась».*

Дополнительно можно уточнить: *«Также нельзя оставить жену на берегу, если рядом с ней находятся чужие мужья без своих жён. Жёнам одним грести разрешается».*

Конечно, многие пробовали решать такие задачи перебором вариантов и добивались успеха. Можете и вы попробовать свои силы. Немаловажное значение имеет и оформление решения, особенно наглядное. Возможно описание шагов алгоритма текстом, таблицей, графом и схематичным рисунком. Разберём один из вариантов решения.

## 1 способ {#section-1}

Обозначим для удобства пары через Аа, Бб, Вв, — где маленькие буквы это жёны, а большие — мужья. Вот схема перевозок, реализующая нужную переправу за 11 рейсов. Стрелки указывают направление движения лодки.

{% include article-figure.html id="fig-3" %}

Сможете ли вы организовать переправу за меньшее число рейсов? А если пар будет четыре, как быть тогда?

У этой задачи есть и другие условия:

- Можно ли переправиться четырём парам на трёхместной лодке?
- Можно ли переправить четыре пары на двухместной лодке, если на реке есть остров, на котором можно временно оставлять людей?






