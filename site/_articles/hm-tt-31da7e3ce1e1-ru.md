---
schema_version: 1
article_id: hm-tt-31da7e3ce1e1
source_work_id: tt-31da7e3ce1e1
layout: article
title: Вероятностная бумага
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-31da7e3ce1e1
description: "Вероятностная бумага меняет шкалу так, чтобы функция заданного распределения изображалась прямой. Для нормального распределения близость эмпирических точек к прямой позволяет наглядно оценить соответствие выборки этому закону без знания его параметров."
type: essay
tags:
- Инструменты
- Вероятность
- Вероятностная_бумага
math: true
status: published
date: '2024-05-12'
permalink: /ru/articles/hm-tt-31da7e3ce1e1/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-30; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-05-12'
  url: https://teletype.in/@history_math/Veroyatnostnaya-bumaga-05-12
source_url: https://teletype.in/@history_math/Veroyatnostnaya-bumaga-05-12
figures:
- id: fig-1
  path: /assets/images/hm-tt-31da7e3ce1e1/veroyatnostnaya-bumaga-05-12-01.png
  alt: 'Образец вероятностной бумаги: график функции нормального распределения со средним 100 и стандартным отклонением 8'
  caption: 'Образец вероятностной бумаги: график функции нормального распределения со средним 100 и стандартным отклонением
    8'
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img1.teletype.in/files/c6/30/c630054f-a586-44e7-aa80-c118e448f81f.png
- id: fig-2
  path: /assets/images/hm-tt-31da7e3ce1e1/veroyatnostnaya-bumaga-05-12-02.png
  alt: Валодди Вейбулл (1887–1979), шведский инженер и математик
  caption: Валодди Вейбулл (1887–1979), шведский инженер и математик
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/29/b0/29b0692c-7362-404f-83c8-5e0f8aad0228.png
preview_image: /assets/images/hm-tt-31da7e3ce1e1/veroyatnostnaya-bumaga-05-12-01.png
cover_image: /assets/images/hm-tt-31da7e3ce1e1/veroyatnostnaya-bumaga-05-12-01.png
---
{% include article-figure.html id="fig-1" %}

Существует несколько методов определения соответствия результатов статистических измерений нормальному закону. Одним из наглядных способов применения метода номограмм в математической статистике является вероятностная бумага или диаграмма Вейбулла, названная в честь Валодди Вейбулла (швед. Waloddi Weibull, 1887–1979), шведского инженера и математика, описавшего теорию непрерывных распределений (1951).

{% include article-figure.html id="fig-2" %}

Вероятностная бумага (англ. Probabilistic Paper, Probability Plot) — специальным образом разграфлённая бумага. Она строится так, что график функции нормального распределения изображается на ней прямой линией. Это достигается за счёт изменения шкалы на вертикальной оси.

На таком свойстве «выпрямления» основан простой способ проверки гипотезы о принадлежности данной выборки к нормальной совокупности.

Если построенная на вероятностной бумаге эмпирическая функция распределения достаточно хорошо приближается прямой линией, то есть основание полагать, что совокупность, из которой взята выборка, является почти нормальной. Достоинство метода состоит в том, что вывод о принадлежности к нормальной совокупности можно сделать без знания численных значений параметров распределения.

Если точки аппроксимируются в кривую линию, то распределение отличается от нормального и при этом можно оценить кривизну и асимметрию функции плотности распределения.

Вероятностную бумагу можно сделать для любого распределения. Для этого требуется лишь соответствующим образом изменить масштаб, чтобы зависимость функции распределения от случайной переменной изображалась прямой.

В настоящее время проверку распределения на нормальность можно выполнить в офисных табличных приложениях, например, в MS Excel.

## Почитать по теме {#section-1}

1. Большая Советская Энциклопедия / Гл. ред. А. М. Прохоров. — М.: Советская энциклопедия, 1970–1978.

2. Математическая энциклопедия. Т. 1 / гл. ред. И.М. Виноградов. — М.: Советская энциклопедия, 1977. — 1184 с.

3. Потапов Ю. В. Метод вероятностной бумаги для задачи однородности // Вестник Томского государственного университета — 2002 — №275 — С. 216 — 217.


