---
schema_version: 1
article_id: hm-tt-0a8e3e9ac2f8
source_work_id: tt-0a8e3e9ac2f8
layout: article
title: Метод смешивания Магницкого
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-0a8e3e9ac2f8
description: "Метод «рыбки» Магницкого определяет пропорции смеси по разностям исходных и требуемого значений цены или концентрации. В задаче о винах по 10 и 6 гривен смесь ценой 7 гривен получается из одной части дорогого вина и трёх частей дешёвого."
type: essay
tags:
- историяматематики
- опыты
- магницкий
- смешивание
- рыбка
math: true
status: published
date: '2025-01-03'
permalink: /ru/articles/hm-tt-0a8e3e9ac2f8/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-01-03'
  url: https://teletype.in/@history_math/Magnitsky-Arithmetic
source_url: https://teletype.in/@history_math/Magnitsky-Arithmetic
figures:
- id: fig-1
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
  alt: Обложка учебника Л. Ф. Магницкого «Арифметика, сиречь наука числительная», 1703
  caption: Обложка учебника Л. Ф. Магницкого «Арифметика, сиречь наука числительная», 1703
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/11/8d/118d1e53-21b5-4e3e-b4f4-223ed119bf0e.jpeg
- id: fig-2
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-02.png
  alt: Схема, объясняющая в каком отношении надо смешивать исходные растворы
  caption: Схема, объясняющая в каком отношении надо смешивать исходные растворы
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/53/58/5358c5e2-222c-4cf1-8aea-f4e70819f12f.png
- id: fig-3
  path: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-03.png
  alt: Схема «Рыбки»
  caption: Схема «Рыбки»
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/13/55/1355be6c-5b2f-42a7-aaf0-0501bb6cc3bc.png
preview_image: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
cover_image: /assets/images/hm-tt-0a8e3e9ac2f8/magnitsky-arithmetic-01.jpeg
---
{% include article-figure.html id="fig-1" %}

Текстовым задачам «на смеси» уделялось значительное внимание в старинных рукописях, в том числе и в «Арифметике» Леонтия Филипповича Магницкого. В литературных источниках этот старинный метод имеет различные названия: «метод Магницкого», «метод рыбки» или «метод креста».

Задачи «на смеси и сплавы» встречаются в заданиях ОГЭ, ЕГЭ и математических олимпиад, поэтому методам их решения уделяется определённое внимание. Предлагаемое решение можно считать ещё одним лайфхаком.

Рассмотрим задачу из «Арифметики» Л. Ф. Магницкого.

*«У некоторого человека были для продажи вина двух сортов. Первое ценою 10 гривен ведро, второе же — по 6 гривен. Захотелось ему сделать из тех двух вин, взяв по части, третье вино, чтобы ему цена была по 7 гривен. Какие части надлежат из тех двух вин взять к наполнению ведра третьего вина ценою 7 гривен?»*

Есть различные способы решения подобных задач на смеси. Посмотрите их в наших комментариях. Нас же в историко-математическом канале интересуют именно старинные способы решения. Что же предлагается в методе Л. Ф. Магницкого?

Строится схема, похожая на рыбку.

Друг под другом записывают данные о веществах имеющихся растворов (процентное содержание, концентрация или стоимость), слева от них посередине — содержание вещества в смеси, который должен получиться после смешивания.

Соединяем написанные числа прямыми. В каждой паре из большего числа вычитаем меньшее, и результат записываем в конце (хвосте рыбки) соответствующей ломаной. Получаемые массовые доли показывают, в каком отношении надо смешивать исходные растворы. Записываем пропорцию и решаем её.

{% include article-figure.html id="fig-2" %}

В задаче про смешивание вин это решение выглядит так.

Запишем цены вин каждого сорта и цену смеси в голове рыбки.

Вычислим прибыль 7 − 6 = 1 и убыток 10 − 7 = 3 на каждом ведре и запишем результат по линиям в хвосте рыбки.

Таким образом, 3 части из четырёх приходятся на более дешёвое вино и 1 часть — на более дорогое.

Дадим решение задачи в общем виде, это и будет объяснением «Рыбки». Обозначим количества смешиваемых вин через m₁ и m₂, а стоимости ведра вина первого сорта, второго сорта и смеси р₁, р₂ и р соответственно. Так как стоимость смеси равна сумме стоимостей смешиваемых частей, то будет выполняться равенство:

m₁p₁ + m₂p₂ = (m₁ + m₂)р

Тогда отношение взятых частей двух вин равно:

$$
m_{1}/m_{2} = (p_{2} - p)/(p - p_{1})
$$

Это и есть результат описанной схемы «Рыбки».

{% include article-figure.html id="fig-3" %}

Эту схему можно применять и при решении других типов задач на смеси и сплавы. Только р₁, р₂ и р в них будут означать концентрации.






