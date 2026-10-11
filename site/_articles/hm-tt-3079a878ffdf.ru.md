---
schema_version: 1
article_id: hm-tt-3079a878ffdf
source_work_id: tt-3079a878ffdf
layout: article
title: 'Задача Эйнштейна: геометрия чисел'
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-3079a878ffdf
description: Среди множества математических головоломок, приписываемых Альберту Эйнштейну, особое место занимает задача о
  девяти числах и семи...
type: problem
tags:
- историяматематики
- задачи
- эйнштейн
- головоломка
math: true
status: draft
date: '2025-05-01'
permalink: /ru/articles/hm-tt-3079a878ffdf/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval remains pending; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-05-01'
  url: https://teletype.in/@history_math/The-Einstein-Triangle
source_url: https://teletype.in/@history_math/The-Einstein-Triangle
figures:
- id: fig-1
  path: /assets/images/hm-tt-3079a878ffdf/the-einstein-triangle-01.png
  alt: Альберт Эйнштейн (Albert Einstein, 1879–1955)
  caption: Альберт Эйнштейн (Albert Einstein, 1879–1955)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6e/cc/6ecc226b-cc70-4909-adef-56f08c5e5532.png
- id: fig-2
  path: /assets/images/hm-tt-3079a878ffdf/the-einstein-triangle-02.png
  alt: Одна из возможных схем головоломки. Кружки — места для чисел, треугольники перекрываются
  caption: Одна из возможных схем головоломки. Кружки — места для чисел, треугольники перекрываются
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/aa/0b/aa0bc753-6005-481c-b193-95229b346784.png
- id: fig-3
  path: /assets/images/hm-tt-3079a878ffdf/the-einstein-triangle-03.png
  alt: Один из возможных вариантов решения. Все суммы равны 15
  caption: Один из возможных вариантов решения. Все суммы равны 15
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/07/04/0704edaf-7cbf-4f5d-aab2-3406e6a4fbcb.png
preview_image: /assets/images/hm-tt-3079a878ffdf/the-einstein-triangle-01.png
cover_image: /assets/images/hm-tt-3079a878ffdf/the-einstein-triangle-01.png
---
{% include article-figure.html id="fig-1" %}

Среди множества математических головоломок, приписываемых Альберту Эйнштейну, особое место занимает задача о девяти числах и семи треугольниках. Прямых доказательств, что её автором был сам Эйнштейн, нет, но сама задача — блестящий пример комбинаторной сложности и математической красоты.

## В чём же её суть? {#section-1}

*«Девять кружков образуют вершины четырёх малых и трёх больших равнобедренных треугольников. Требуется вписать в эти кружки числа от 1 до 9 так, чтобы суммы чисел, стоящих в вершинах каждого из семи треугольников, были равны».*

**Примечание:** у больших треугольников учитываются только числа в трёх крайних вершинах.

Попробуйте сначала решить задачу самостоятельно. Учтите, что каждое число участвует в двух или трёх треугольниках. Здесь важна аккуратность: ошибка в одном треугольнике может повлиять на все остальные.

{% include article-figure.html id="fig-2" %}

## Историческая справка {#section-2}

Задача впервые появилась в англоязычном математическом журнале Journal of Recreational Mathematics в 1970-х годах под названием The Triangle Sum Puzzle.

Предположительно, она — одна из вариаций магических квадратов и других головоломок, где числа распределяются по структуре с определёнными суммами.

## Решение {#section-3}

Сумма чисел от 1 до 9 равна 45. Каждое число участвует в нескольких треугольниках, но структура построена так, что три малых треугольника не имеют общих вершин, а четвёртый содержит центральные значения.

Это значит, что сумма чисел в каждом треугольнике должна быть 15.

Рекомендуем начать с центрального треугольника и расположить там числа 4, 5, 6. После этого задача решается логически — по совокупности условий и симметрии.

{% include article-figure.html id="fig-3" %}





