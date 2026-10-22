---
schema_version: 1
article_id: hm-tt-1c23e0d766d2
source_work_id: tt-1c23e0d766d2
layout: article
title: 'Простые числа: история через века'
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-1c23e0d766d2
description: «Простые числа созданы для того, чтобы их умножать»
type: essay
tags:
- историяматематики
- простые_числа
- эратосфен
- евклид
- ферма
- мерсенн
- rsa
math: true
status: published
date: '2024-12-01'
permalink: /ru/articles/hm-tt-1c23e0d766d2/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approval granted by the owner on 2026-10-21; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-12-01'
  url: https://teletype.in/@history_math/prime-numbers
source_url: https://teletype.in/@history_math/prime-numbers
figures:
- id: fig-1
  path: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-01.png
  alt: 'Возможно, как-то так Эратосфен изобрёл «решето Эратосфена»: алгоритм последовательного нахождения всех простых чисел
    от 1 до n'
  caption: 'Возможно, как-то так Эратосфен изобрёл «решето Эратосфена»: алгоритм последовательного нахождения всех простых
    чисел от 1 до n'
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img4.teletype.in/files/77/5a/775af296-f26c-4cc0-967e-7230b491452b.png
- id: fig-3
  path: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-03.png
  alt: Первые простые числа от 0 до 100 (отмечены красным) могут быть легко найдены вручную, при помощи «решета Эратосфена»
  caption: Первые простые числа от 0 до 100 (отмечены красным) могут быть легко найдены вручную, при помощи «решета Эратосфена»
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img4.teletype.in/files/f5/d3/f5d36c43-4909-40fa-9470-ea03c7ef9080.png
- id: fig-4
  path: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-04.jpeg
  alt: Пьер Ферма (1607–1665)
  caption: Пьер Ферма (1607–1665)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/a9/bb/a9bb6b59-1754-4ab8-9137-98bd830dd9ec.jpeg
- id: fig-5
  path: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-05.png
  alt: Марен Мерсенн (1588–1648)
  caption: Марен Мерсенн (1588–1648)
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/23/58/235884f0-e884-4887-8347-e8ed6e5290c6.png
preview_image: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-01.png
cover_image: /assets/images/hm-tt-1c23e0d766d2/prime-numbers-01.png
---
{% include article-figure.html id="fig-1" %}

> «Простые числа созданы для того, чтобы их умножать»

> Л. Д. Ландау

История простых чисел — одна из историй математики, которая продолжается через века и тысячелетия. Начавшись от Пифагора и Евклида, она пишется и в наши дни, да и, пожалуй, никогда не завершится, потому что простых чисел бесконечно много, а потребность поиска всё больших простых чисел существует и сейчас.

12 октября 2024 года Люк Дюран (Luke Durant, Сан-Хосе, Калифорния) обнаружил новое самое большое известное на сегодня простое число: $2^{136279841}-1$.


Оно было найдено в рамках проекта GIMPS (Great Internet Mersenne Prime Search). Это число состоит из 41 024 320 десятичных цифр. Если записать его в шестнадцатеричной системе счисления, то это будет цифра 1, за которой следуют 34 069 960 цифр F.

Оно принадлежит классу простых чисел Мерсенна (52-е число), которые являются крайне редкими — известно только 52 таких числа. Для поиска нового числа Дюран использовал программу распределённых вычислений, которая объединила тысячи серверов по всему миру. Его вычислительная система охватывала 24 региона дата-центров в 17 странах.

Цифр в числе на 16 миллионов больше, чем у предыдущего рекордсмена: с 2018 года самым большим простым числом считалось $2^{82589933}-1$. Его обнаружил американский IT-специалист Патрик Лярош (Patrick Laroche). Десятичная запись этого числа состоит из 24 862 048 цифр. Это 51-е простое число Мерсенна.

Немного о простых числах. В России о них знает практически каждый школьник. Более того, в школьных экзаменах ОГЭ и ЕГЭ есть задачи на их применение. Им посвящены множество исследований и книг.

Они обладают различными красивыми свойствами, например, разложение натуральных чисел на простые множители (основная теорема арифметики). Однако не все их свойства ещё изучены. Многие проблемы, касающиеся простых чисел, остаются открытыми.

Простое число — натуральное число, имеющее ровно два различных натуральных делителя. О них знали ещё математики Древней Греции. Пифагор изучал простые (линейные) числа. Эратосфен изобрёл «решето Эратосфена»: алгоритм последовательного нахождения всех простых чисел от $1$ до $n$. Евклид доказал, что множество простых чисел бесконечно.

{% include article-figure.html id="fig-3" %}

Пьер Ферма (фр. Pierre de Fermat) высказал предположение, что все числа вида $F_n=2^{2^n}+1$ являются простыми. При $n=0,1,2,3,4$ числа Ферма простые и равны 3, 5, 17, 257, 65537.

Пока других простых чисел Ферма не обнаружено, и неизвестно, существуют ли простые числа при $n\gt 4$ или же все остальные числа Ферма — составные.

{% include article-figure.html id="fig-4" %}

Французский математик Марен Мерсенн (фр. Marin Mersenne) предположил, что числа $M_n=2^n-1$, где $n$ — простое, также простые числа (числа Мерсенна). Проверка верности предположения была намного выше возможностей того времени. Только в XX веке было обнаружено, что гипотеза была ложной.

{% include article-figure.html id="fig-5" %}

Тем не менее, числа Мерсенна давно удерживают рекорд как самые большие известные простые числа.

Долгое время простые числа считались малоприменимыми за пределами чистой теоретической математики. Ситуация изменилась в 1970-е годы, после появления систем криптографии с открытым ключом, в которых простые числа составили основу первых алгоритмов шифрования, таких как RSA (аббревиатура от фамилий Rivest, Shamir и Adleman).








