---
schema_version: 1
article_id: hm-tt-3baa380bee70
source_work_id: tt-3baa380bee70
layout: article
title: 'Проблема комбинаторики: задача Киркмана о школьницах'
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-3baa380bee70
description: Задача о 15 школьницах долгое время считалась одной из самых знаменитых проблем в комбинаторике. Её предложил
  Томас Пеннингтон Киркман...
type: problem
tags:
- историяматематики
- киркман
- школьницы
- комбинаторика
- проблема
- задачи
math: true
status: published
date: '2024-10-08'
permalink: /ru/articles/hm-tt-3baa380bee70/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by Tim55667757; owner approval recorded; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-10-08'
  url: https://teletype.in/@history_math/Kirkman-schoolgirls
source_url: https://teletype.in/@history_math/Kirkman-schoolgirls
figures:
- id: fig-1
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
  alt: 'Иллюстрация 1 к статье «Проблема комбинаторики: задача Киркмана о школьницах»'
  caption: ''
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a8/31/a83170d4-c50a-4ff4-8d43-f0d796b9f413.png
- id: fig-2
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-02.png
  alt: Томас Пеннингтон Киркман (Thomas Pennyngton Kirkman, 1806–1895) — английский математик. Окончил Дублинский университет
    (1833). Самостоятельно изучал математику. С 1839 был приходским священником
  caption: Томас Пеннингтон Киркман (Thomas Pennyngton Kirkman, 1806–1895) — английский математик. Окончил Дублинский университет
    (1833). Самостоятельно изучал математику. С 1839 был приходским священником
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img4.teletype.in/files/b5/c0/b5c0a2b7-45dd-4c9f-b5bd-aae9d6e8ed44.png
- id: fig-3
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-03.jpeg
  alt: Обложка и страница из журнала The Lady's and Gentleman's Diary за 1850 г. с оригинальной публикацией задачи Киркмана
    о школьницах (6-й вопрос на странице справа внизу)
  caption: Обложка и страница из журнала The Lady's and Gentleman's Diary за 1850 г. с оригинальной публикацией задачи Киркмана
    о школьницах (6-й вопрос на странице справа внизу)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/49/7d/497d2489-c099-41fc-b67f-185319d162cf.jpeg
- id: fig-4
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-04.png
  alt: Одно из решений задачи Киркмана о школьницах. Девушки пронумерованы от 0 до 14
  caption: Одно из решений задачи Киркмана о школьницах. Девушки пронумерованы от 0 до 14
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img4.teletype.in/files/b5/d3/b5d3a8c5-063d-44a1-b903-0316e1690348.png
- id: fig-5
  path: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-05.png
  alt: Решение задачи Киркмана о школьницах используя XOR-тройки
  caption: Решение задачи Киркмана о школьницах используя XOR-тройки
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/d9/3a/d93a68ae-dd40-4080-8831-d918e450b6fb.png
preview_image: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
cover_image: /assets/images/hm-tt-3baa380bee70/kirkman-schoolgirls-01.png
---
{% include article-figure.html id="fig-1" %}

Задача о 15 школьницах долгое время считалась одной из самых знаменитых проблем в комбинаторике. Её предложил Томас Пеннингтон Киркман (1806–1895) — английский математик, алгебраист, член Лондонского королевского общества (1881). Его труды являются первым систематическим изложением элементов теории групп на английском языке. Также он внёс большой вклад в комбинаторику.

{% include article-figure.html id="fig-2" %}

Задача о 15 школьницах была опубликована в 1850 году как Вопрос VI в журнале The Lady's and Gentleman's Diary (журнал занимательной математики, издававшийся между 1841 и 1871 годами).

{% include article-figure.html id="fig-3" %}

Задача формулируется так:

> «Пятнадцать молодых девушек в школе прогуливаются по три в ряд семь дней, каждый день. Требуется распределить их на каждую прогулку так, чтобы никакие две девушки не шли в том же ряду».

> (Fifteen young ladies in a school walk out three abreast for seven days in succession: it is required to arrange them daily, so that no two shall walk twice abreast).

В силу своей ложной простоты задача быстро стала знаменитой.  
Одно из возможных решений приведено в таблице ниже. В ней девушки пронумерованы от 0 до 14.

{% include article-figure.html id="fig-4" %}

Известно, что существует семь неизоморфных решений этой задачи о 15 школьницах.

*(Изоморфизм — это биективное отображение между множествами с одинаковой структурой, сохраняющее эту структуру).*

Первое решение опубликовал Артур Кэли (1850). За ним быстро последовало решение самого Киркмана (1850). Оно было дано как специальный случай его комбинаторного размещения, опубликованного тремя годами ранее (1847). Д. Д. Сильвестр также исследовал эту задачу. Головоломка появилась в нескольких занимательных математических книгах.

Комбинаторные схемы стали очень популярны и применялись даже в мошенничествах с азартными играми. Была история, когда преступный картель заработал миллионы долларов за семь лет, скупая билеты со всеми возможными комбинациями 5 из 46 в лотерее 6 из 46, если стоимость билетов была ниже, чем дополнительные бонусы за выигрыш 5 из 46 плюс вероятность выигрыша джекпота.

Другое решение задачи даётся XOR-тройками. Если девушек перенумеровать двоичными числами от 0001 до 1111, следующее распределение является решением, таким, что для любых трёх девушек, образующих группу, побитное XOR двух чисел даёт третье.

*(Побитовое исключающее «ИЛИ» (XOR) — бинарная операция, действие которой эквивалентно применению логического исключающего «ИЛИ» к каждой паре битов, которые стоят на одинаковых позициях в двоичных представлениях операндов.)*

{% include article-figure.html id="fig-5" %}

Задача была обобщена и на другие начальные условия: есть n школьниц, нужно создать группы размером k, так что наборы из t девушек никогда не встречались дважды в одной группе. Такая формулировка задачи называется схемой (n, k, t). Задача решается при некоторых условиях и не решается при некоторых других. За минувшие годы решение стало известно для многих сочетаний (n, k, t), которые были проверены либо алгебраически, либо перебором на компьютерах.

В результате, головоломка о школьницах помогла сформировать новое направление математики: комбинаторные схемы. Эти схемы стали методом, который применяется сейчас в кодах коррекции ошибок в информатике, криптографии, сельском хозяйстве, спорте, дизайне. Например, классический код Хэмминга для коррекции ошибок использует решение задачи про школьниц.







