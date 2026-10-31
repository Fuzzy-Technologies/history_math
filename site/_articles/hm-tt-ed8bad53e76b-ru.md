---
schema_version: 1
article_id: hm-tt-ed8bad53e76b
source_work_id: tt-ed8bad53e76b
layout: article
title: 'Ход конём: конь, который перепрыгнул века (Knight''s tour)'
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-ed8bad53e76b
description: "Обход шахматной доски конём без повторения клеток соответствует гамильтонову пути в графе возможных ходов. Правило Варнсдорфа предлагает выбирать клетку с наименьшим числом продолжений, но разбор подчёркивает, что такой выбор не гарантирует полного обхода."
type: essay
tags:
- историяматематики
- опыты
- эйлер
- шахматы
- конь
math: true
status: published
date: '2025-04-09'
permalink: /ru/articles/hm-tt-ed8bad53e76b/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-04-09'
  url: https://teletype.in/@history_math/Knight-tour
source_url: https://teletype.in/@history_math/Knight-tour
figures:
- id: fig-1
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
  alt: Леонард Эйлер (Leonhard Euler, 1707–1783). Портрет работы Я. Э. Хандманна (Jakob Emanuel Handmann), 1753
  caption: Леонард Эйлер (Leonhard Euler, 1707–1783). Портрет работы Я. Э. Хандманна (Jakob Emanuel Handmann), 1753
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img4.teletype.in/files/78/fb/78fb66f9-ab5c-446d-b78f-80289eabd368.jpeg
- id: fig-2
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-02.png
  alt: Маршрут, якобы найденный шахматным автоматом «Турок»
  caption: Маршрут, якобы найденный шахматным автоматом «Турок»
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/1a/53/1a5371f2-4054-4df4-871d-a8dd7e68847c.png
- id: fig-3
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-03.png
  alt: Клетки, в которых конь уже побывал, надо перечёркивать. Для определённости алгоритма, надо выбирать ту клетку, которая
    имеет наименьший номер
  caption: Клетки, в которых конь уже побывал, надо перечёркивать. Для определённости алгоритма, надо выбирать ту клетку,
    которая имеет наименьший номер
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/5e/77/5e774b9a-a5f2-4eab-a3b5-f81a666acf61.png
- id: fig-4
  path: /assets/images/hm-tt-ed8bad53e76b/knight-tour-04.gif
  alt: Анимация прохождения коня через все клетки поля шахматной доски 5 × 5
  caption: Анимация прохождения коня через все клетки поля шахматной доски 5 × 5
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/c5/2f/c52fc5eb-413a-42c9-aa47-2005687f3fd4.gif
preview_image: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
cover_image: /assets/images/hm-tt-ed8bad53e76b/knight-tour-01.jpeg
---
{% include article-figure.html id="fig-1" %}

В 1759 году Леонард Эйлер, один из величайших умов Просвещения, опубликовал работу *«Решение одного любопытного вопроса, который, кажется, не подчиняется никакому известному методу»*. Речь шла о задаче, знакомой каждому шахматисту: как пройти конём по всем 64 клеткам доски, не посетив ни одну дважды?

Со временем задача неоднократно обобщалась. Например, доска не обязательно содержит 64 клетки — это может быть произвольная прямоугольная доска, разделённая на m × n одинаковых клеток.

Частные решения этой задачи нашли Леонард Эйлер, Александр Вандермонд и другие. Конечно же, решали и известные шахматисты, например, Карл Андреевич Яниш и Василий Николаевич Панов.

В терминах теории графов каждый маршрут коня, проходящий через все поля шахматной доски, соответствует гамильтонову пути (или циклу, если маршрут замкнутый) в графе, вершинами которого являются поля доски, и два поля соединены ребром, если с одного можно попасть на другое за один ход коня. Для доски 8 × 8 количество всех замкнутых маршрутов коня (гамильтоновых циклов) без учёта направления обхода равно 13 267 364 410 532. Количество всех незамкнутых маршрутов (с учётом направления обхода) равно 19 591 828 170 979 904.

Задача допускает разные математические модели и алгоритмы, компьютерные программы, решается и шахматными автоматами.

{% include article-figure.html id="fig-2" %}

В 1823 году некто Варнсдорф издал брошюру «Простейшее и наиболее общее решение задачи о ходе коня», в которой предложил алгоритм для обхода доски размером 8 × 8.

*«На каждом ходу ставь коня на такое поле, из которого можно совершить наименьшее число ходов на ещё не пройденные поля. Если таких полей несколько, разрешается выбирать любое из них.»*

На практике это правило легко позволяет строить обходы доски. Тем не менее, долгое время не было известно, справедливо ли оно. Опровержение правила Варнсдорфа приведено в нескольких работах. Для любого исходного поля доски существуют контрпримеры, построенные с помощью компьютера. Иными словами, с какого бы поля конь ни начал движение, следуя правилу Варнсдорфа, его можно завести в тупик до полного обхода доски.

Тем не менее, попробуйте применить это правило. Надо полагать, что клетки каким-нибудь образом занумерованы (например, так, как на рисунке). Клетки, в которых конь уже побывал, надо перечёркивать. Для определённости алгоритма, надо выбирать ту клетку, которая имеет наименьший номер.

{% include article-figure.html id="fig-3" %}

Эта задача встречается в некоторых сборниках старинных и занимательных задач, например:

1. Балк М. Б., Балк Г. Д. Математика после уроков. Пособие для учителей. — М.: «Просвещение», 1971. — 462 с.
2. Гик Е. Я. Шахматы и математика. — М.: Наука, 1983. — 176 с.
3. Игнатьев Е. И. В царствие смекалки. — М: Наука, 1978. — 192 с.

{% include article-figure.html id="fig-4" %}






