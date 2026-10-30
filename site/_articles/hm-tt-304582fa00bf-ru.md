---
schema_version: 1
article_id: hm-tt-304582fa00bf
source_work_id: tt-304582fa00bf
layout: article
title: Вычисление времени удвоения капитала (Правило 72)
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-304582fa00bf
description: Люди приходят на фондовый рынок, покупают акции, облигации и другие активы. Но прежде надо поставить цель и посчитать,
  через какой срок...
type: essay
tags:
- Лайфхаки
- Правило72
- сложныйпроцент
math: true
status: published
date: '2023-09-09'
permalink: /ru/articles/hm-tt-304582fa00bf/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-30; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2023-09-09'
  url: https://teletype.in/@history_math/Vychislenie-vremeni-udvoeniya-kapitala-Pravilo-72-09-09
source_url: https://teletype.in/@history_math/Vychislenie-vremeni-udvoeniya-kapitala-Pravilo-72-09-09
figures:
- id: fig-1
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
  alt: Иллюстрация 1 к статье «Вычисление времени удвоения капитала (Правило 72)»
  caption: ''
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/87/fe/87fe2f0d-baba-4573-9995-4afeb0422a4a.png
- id: fig-2
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-02.png
  alt: Вывод эмпирического «Правила 72»
  caption: Вывод эмпирического «Правила 72»
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/01/83/0183f865-e211-4c4d-9c87-2f20eede7492.png
- id: fig-3
  path: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-03.png
  alt: Портрет Луки Пачоли (1445–1517), предположительно авторства Якопо де Барбари, 1495
  caption: Портрет Луки Пачоли (1445–1517), предположительно авторства Якопо де Барбари, 1495
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/98/4d/984de790-0617-4eea-876f-ece9c679f434.png
preview_image: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
cover_image: /assets/images/hm-tt-304582fa00bf/vychislenie-vremeni-udvoeniy-01.png
---
{% include article-figure.html id="fig-1" %}

Люди приходят на фондовый рынок, покупают акции, облигации и другие активы. Но прежде надо поставить цель и посчитать, через какой срок она будет достигнута.

Хотите быстро узнать время, которое потребуется, чтобы ваш денежный вклад с определённой процентной ставкой удвоился? Тут не нужен калькулятор, достаточно знать «Правило 72». Делим число 72 на нашу процентную ставку, после чего получаем приблизительный срок, через который вклад удвоится.

Например, если вклад сделан под 5% годовых, то потребуется 14 с небольшим лет, чтобы он удвоился.

Это эмпирическое правило T=72/r приближённой оценки срока T, в течение которого величина вырастет вдвое при постоянном росте на некоторый процент r. Вывод правила основан на применении формулы сложных процентов и её упрощении при некоторых допущениях.

{% include article-figure.html id="fig-2" %}

В качестве названия правила может использоваться любой из вариантов «Правило 69», «Правило 70» или «Правило 72». 72 делится нацело на 2, 3, 4, 6, 8, 9, 12, 18, что позволяет посчитать множество стандартных процентных ставок в уме. Оно рассматривается как приближённое значение 100ln2 = 69,3. То есть более точно надо делить 69 на процент, но целое число 70 запоминается проще. А замена 69,3 на 72 даёт погрешность в результате приблизительно на 3%. Наилучший результат для числа 72 получается, когда ставка находится в пределах от 5% до 10% годовых.

«Правило 72» может использоваться не только для оценки роста денежной суммы, но также для любых других процессов, описываемых экспоненциальной зависимостью. Срок при этом не обязан исчисляться в годах; нужно только, чтобы коэффициент r говорил об изменении величины за ту же единицу времени, в каких измеряется период удвоения T.

Кроме того, величина не обязана увеличиваться, она может уменьшаться на r процентов за единицу времени. Тогда оценивается срок не удвоения величины, а уменьшения её вдвое.

{% include article-figure.html id="fig-3" %}

Первое упоминание о правиле содержится у Луки Пачоли (1445–1517) в его математическом трактате «Сумма знаний по арифметике, геометрии, отношениям и пропорциональности» (1494).

**Примеры**

1. Оцените срок, в течение которого цены вырастут вдвое в результате инфляции, если за год они растут на r процентов.

2. За тысячелетие количество радиоактивного материала в слитке падает на r процентов. Через какое время количество радиоактивного материала сократится вдвое? (Закон радиоактивного распада)


