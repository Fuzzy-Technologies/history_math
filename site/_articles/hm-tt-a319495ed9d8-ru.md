---
schema_version: 1
article_id: hm-tt-a319495ed9d8
source_work_id: tt-a319495ed9d8
layout: article
title: Хитрые солдаты в корчме
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-a319495ed9d8
description: "В задаче Игнатьева 21 солдат и хозяин корчмы выбывают из круга по правилу «каждый седьмой», а платит оставшийся. Рекуррентная формула задачи Иосифа Флавия показывает, что для проигрыша хозяина счёт начинают с шестого солдата слева от него."
type: problem
tags:
- историяматематики
- задачи
- игнатьев
- хитрецы
- флавий
math: true
status: published
date: '2025-04-09'
permalink: /ru/articles/hm-tt-a319495ed9d8/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved under the owner-delegated audit; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2025-04-09'
  url: https://teletype.in/@history_math/Tricky-soldiers-in-the-tavern
source_url: https://teletype.in/@history_math/Tricky-soldiers-in-the-tavern
figures:
- id: fig-1
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
  alt: Тильборх, Гиллис ван - Караульня.jpg, Картина Гиллиса ван Тильборха (ок. 1625 — ок.1678) «Караульня», из коллекции
    Эрмитажа
  caption: Тильборх, Гиллис ван - Караульня.jpg, Картина Гиллиса ван Тильборха (ок. 1625 — ок.1678) «Караульня», из коллекции
    Эрмитажа
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/69/ba/69ba7ba6-8e50-4be8-9ec9-e56f269d0a62.jpeg
- id: fig-2
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-02.png
  alt: Схематичная рассадка солдат к задаче Емельяна Игнатьевича
  caption: Схематичная рассадка солдат к задаче Емельяна Игнатьевича
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img2.teletype.in/files/5b/bb/5bbb1758-bb91-4bc1-b873-784aa9ae4c5f.png
- id: fig-3
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-03.png
  alt: Игнатьев Е. И. В царстве смекалки или арифметика для всех. — Ч. 1–3 — СПб, В. Л. Богушевский, 1908–1911
  caption: Игнатьев Е. И. В царстве смекалки или арифметика для всех. — Ч. 1–3 — СПб, В. Л. Богушевский, 1908–1911
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6a/11/6a11d688-27e4-4a1d-8dc8-48c0d31a105d.png
- id: fig-4
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-04.png
  alt: Историческая задача Иосифа Флавия из книги Кнута «Конкретная математика. Математические основы информатики» (2009)
  caption: Историческая задача Иосифа Флавия из книги Кнута «Конкретная математика. Математические основы информатики» (2009)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2e/f4/2ef4345b-c20a-41a1-9eca-3ca05dfc009a.png
- id: fig-5
  path: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-05.jpeg
  alt: Воображаемый портрет Иосифа Флавия. Иллюстрация Томаса Аддиса Эммета, 1880
  caption: Воображаемый портрет Иосифа Флавия. Иллюстрация Томаса Аддиса Эммета, 1880
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/2c/b6/2cb65096-d61d-4e54-9609-3d42fbd0ae16.jpeg
preview_image: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
cover_image: /assets/images/hm-tt-a319495ed9d8/tricky-soldiers-in-the-taver-01.jpeg
---
{% include article-figure.html id="fig-1" %}

Предлагаем для вашего математического досуга старинную задачу из книги «В царстве смекалки» Емельяна Игнатьевича Игнатьева:

*«В корчме стояло четыре стола, образуя четырёхугольник. Проголодавшиеся, возвращавшиеся с манёвров солдаты остановились там в числе 21 человека пообедать и пригласили к обеду и хозяина. Расселись все так: за тремя из столов сели солдаты — по 7 за каждый стол, а за четвёртым столом сел хозяин».*

{% include article-figure.html id="fig-2" %}

*«Солдаты уговорились с хозяином, что платить по счёту будет тот, кто останется последним при следующем условии: считая в круговую (по часовой стрелке) всех, в том числе и хозяина, освобождать каждого седьмого. Каждый освобождённый уходил из корчмы и последним остался сам хозяин. С кого начали счёт?»*

Е. И. Игнатьев даёт только ответ: *«надо начинать счёт с 6-го солдата, сидящего по левую руку от хозяина»*. Метод решения не приводится.

Попробуйте сами, например, аналогично найти, с кого нужно было бы начать, если бы солдат было по 4 за каждым из трёх столов?

Ну а мы попросим вас объяснить, почему это так надо считать. Решение приведём в конце статьи.

## Историческая справка {#section-1}

{% include article-figure.html id="fig-3" %}

Емельян Игнатьевич Игнатьев (1869–1923) — российский и советский педагог-математик и автор научно-популярных книг. Наиболее известное произведение Игнатьева — «В царстве смекалки», выпущенное в 1908–1911 гг. в трёх томах:

Игнатьев Е. И. В царстве смекалки или арифметика для всех. — Ч. 1–3 — СПб, В. Л. Богушевский, 1908–1911.

Задача похожа на историческую задачу Иосифа Флавия, известную ещё с 1612 года, когда французский математик Баше де Мезириак опубликовал эту задачу в своём сборнике Problem es Plaisants. Сюжет задачи основан на истории, описанной Иосифом Флавием в своём историческом труде «Иудейская война».

{% include article-figure.html id="fig-4" %}

Она заключается в следующем: по кругу стоит 41 воин, начиная с первого воина они убивают каждого третьего. Спрашивается, в каком месте нужно встать, чтобы остаться последним выжившим.

{% include article-figure.html id="fig-5" %}

Иосиф Флавий (лат. Josephus Flavius, ок. 37 – ок. 100 н. э.) — древнееврейский историк и военачальник. Он известен дошедшими до нас на греческом языке трудами — «Иудейская война» (о восстании 66–71 годов) и «Иудейские древности» (где изложена история евреев от сотворения мира до Иудейской войны).

## Решение {#section-2}

Алгоритм решения задачи есть в книге:

Дональд Кнут, Роналд Грэхем, Орен Паташник. Конкретная математика. Математические основы информатики. Concrete Mathematics. A Foundation for Computer Science : \[пер. с англ.\]. — 2-е изд. — М. : Вильямс, 2009. — 784 с.

Это известная в компьютерной алгебре задача на рекуррентные соотношения. Она часто предлагается как тестовая задача в различных ситуациях, в том числе и на собеседованиях.

Используем известные рекуррентные формулы задачи Иосифа Флавия. В более общей формулировке участвует n воинов, которые считаются по кругу, и убивают каждого k-го. Номер безопасного места, то есть последнего выжившего обозначим J(n, k).

Попробуем смоделировать процесс. Создаём список из 22 элементов (0 — хозяин, 1–21 — солдаты).

Известна такая рекуррентная формула на языке модулярных вычислений:

J(n, k) = (J(n − 1, k) + k) mod n, где J(1, k) = 0.

В классической задаче Иосифа Флавия для n = 22 и k = 7 позиция последнего выжившего вычисляется по формуле J(22,7). Но здесь нужно обратное: зная, что последний — позиция 0 (хозяин), найти стартовую позицию. Если при стандартном начале с позиции 0 последний выживший — это J(n,k), то чтобы последней была позиция x, нужно начать с позиции (x − J(n,k)) mod n. Формула стартовой позиции тоже известна: S = (x − J(n,k)) mod n, где x — желаемый последний выживший.

Тогда для нашей задачи: n = 22, k = 7, x = 0 (хозяин). Вычисляется рекуррентно (попробуйте вручную), что J(22,7) = 16.

$$
\begin{aligned}J(1,7) = 0,  \\J(2,7) = (J(1) + 7) mod 2 = (0 + 7) mod 2 = 1,  \\J(3,7) = (1 + 7) mod 3 = 8 mod 3 = 2, ...  \\J(21,7) = (2 + 7) mod 21 = 9 mod 21 = 9,  \\J(22,7) = (9 + 7) mod 22 = 16 mod 22 = 16.\end{aligned}
$$

Нам же нужно, чтобы последний был 0. Тогда по формуле:

$$
S = (0 - 16) mod 22 = (-16) mod 22 = 6
$$

То есть начать счёт нужно с позиции 6.

**Проверка**: если расставить всех участников по кругу (0 — хозяин, 1–21 — солдаты) и начать счёт с 6-й позиции, последовательное удаление каждого 7-го приведёт к тому, что последним останется хозяин.

**Ответ**: надо начинать счёт с 6-го солдата, сидящего по левую руку от хозяина.






