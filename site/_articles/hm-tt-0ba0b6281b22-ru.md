---
schema_version: 1
article_id: hm-tt-0ba0b6281b22
source_work_id: tt-0ba0b6281b22
layout: article
title: Последовательность Фарея
authors:
- Мансур Гильмуллин
author: Мансур Гильмуллин
lang: ru
translation_key: hm-tt-0ba0b6281b22
description: "Последовательности Фарея упорядочивают несократимые дроби от нуля до единицы с ограниченным знаменателем. Построение через медианты, свойства соседних дробей и связь с функцией Эйлера раскрываются в примерах и заданиях."
type: essay
tags:
- опыты
- фарей
- последовательность
- медианта
math: true
status: published
date: '2024-10-26'
permalink: /ru/articles/hm-tt-0ba0b6281b22/
rights_basis: Owner-requested migration of the author's complete Teletype publication on 2026-10-11; editorial publication
  approved by the owner; no new license asserted.
original_publication:
  outlet: Teletype
  date: '2024-10-26'
  url: https://teletype.in/@history_math/Farey-sequence
source_url: https://teletype.in/@history_math/Farey-sequence
figures:
- id: fig-1
  path: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
  alt: Силуэт Джона Фарея, нарисованный его другом Уайтом Уотсоном. Хранится в Музее и художественной галерее Дерби, Англия
  caption: Силуэт Джона Фарея, нарисованный его другом Уайтом Уотсоном. Хранится в Музее и художественной галерее Дерби, Англия
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/6d/df/6ddf6608-9565-44aa-9fa3-d488c701298b.jpeg
- id: fig-3
  path: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-03.png
  alt: 'Страница из статьи Фарея «Об интересном свойстве обыкновенных дробей» ("On a curious property of vulgar fractions".
    The Philosophical Magazine and Journal: Comprehending the various branches of science. the liberal and fine arts, geology,
    agriculture, manufacturers and commerce.,'
  caption: 'Страница из статьи Фарея «Об интересном свойстве обыкновенных дробей» ("On a curious property of vulgar fractions".
    The Philosophical Magazine and Journal: Comprehending the various branches of science. the liberal and fine arts, geology,
    agriculture, manufacturers and commerce., vol. 47, no. 3, pp. 385–386, 1816)'
  source: Архив иллюстраций исходной статьи в Teletype.
  credit: ''
  rights_basis: Original image bytes from the owner-supplied Teletype archive, migrated at the owner request; original attribution
    retained; no new license asserted.
  source_url: https://img3.teletype.in/files/af/9a/af9a8f22-0ac5-4de4-86b4-e33729af3b46.png
preview_image: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
cover_image: /assets/images/hm-tt-0ba0b6281b22/farey-sequence-01.jpeg
---
{% include article-figure.html id="fig-1" %}

> «Последовательности Фарея» (Farey sequence, или ряды Фарея, дроби Фарея, таблица Фарея) — семейство конечных подмножеств рациональных чисел с особыми, математически красивыми, свойствами.

> Последовательность Фарея $n$-го порядка — возрастающая последовательность $F_n$ всех неотрицательных несократимых дробей, не превосходящих $1$, знаменатели которых меньше или равны $n$. Дроби $\frac{0}{1}$ и $\frac{1}{1}$ считаются первым и последним элементами $F_n$.

$$
F_n=\left\lbrace\frac{a}{b}\;\middle|\;0\le a\le b\le n,\ \gcd(a,b)=1\right\rbrace
$$

Дроби располагаются в порядке возрастания:

$$
\frac{a_i}{b_i}<\frac{a_{i+1}}{b_{i+1}}
$$

$$
F_1=\left\lbrace\frac{0}{1},\frac{1}{1}\right\rbrace
$$

$$
F_2=\left\lbrace\frac{0}{1},\frac{1}{2},\frac{1}{1}\right\rbrace
$$

$$
F_3=\left\lbrace\frac{0}{1},\frac{1}{3},\frac{1}{2},\frac{2}{3},\frac{1}{1}\right\rbrace
$$

$$
F_4=\left\lbrace\frac{0}{1},\frac{1}{4},\frac{1}{3},\frac{1}{2},\frac{2}{3},\frac{3}{4},\frac{1}{1}\right\rbrace
$$

$$
F_5=\left\lbrace\frac{0}{1},\frac{1}{5},\frac{1}{4},\frac{1}{3},\frac{2}{5},\frac{1}{2},\frac{3}{5},\frac{2}{3},\frac{3}{4},\frac{4}{5},\frac{1}{1}\right\rbrace.
$$

*Определение множества $F_n$ и последовательности Фарея до $n=5$*

Джон Фарей (1766–1826, John Farey) — английский геолог, писатель. Один из пионеров геофизики. Автор многочисленных научных работ в области геологии, метрологии, садоводства, музыки. Его единственным вкладом в математику были дроби, названные его именем. Это результат его исследований математики звука.

В 1816 году была опубликована краткая статья Фарея «Об интересном свойстве обыкновенных дробей», в которой он определил последовательность $F_n$.

{% include article-figure.html id="fig-3" %}

Эта статья дошла до французского математика О. Л. Коши, который в том же году опубликовал доказательство гипотезы Фарея о том, что каждый новый член последовательности Фарея порядка $n$ является медиантой своих соседей.

Понятие медианты двух дробей введено А. Я. Хинчиным в теории цепных дробей. Медианта двух обыкновенных дробей $\frac{a}{b}$ и $\frac{c}{d}$ равна отношению суммы их числителей к сумме знаменателей: $\frac{a+c}{b+d}$.

Последовательность Фарея порядка $n+1$ можно построить рекурсивно из последовательности порядка $n$ по следующему правилу:

1. Копируем все элементы последовательности порядка $n$.
2. Если сумма знаменателей в двух соседних дробях последовательности порядка $n$ даёт число не большее, чем $n+1$, то вставляем между этими дробями их медианту.

Давайте проделаем небольшой эксперимент и получим опыт работы с последовательностями Фарея. Вот пробные задания для этого:

1. Попытайтесь самостоятельно построить последовательность $F_6$.
2. Докажите, что если $\frac{a}{b}<\frac{c}{d}$ — две соседние дроби в последовательности Фарея $F_n$, то $bc-ad=1$. Справедливо и обратное утверждение: если дроби $\frac{a}{b}<\frac{c}{d}$ таковы, что $bc-ad=1$, то они представляют собой соседние члены ряда Фарея $F_n$, где $n=\max(b,d)$.
3. Медианта двух дробей обладает таким замечательным свойством: она лежит между ними. Попробуйте это доказать.  
  Если $\frac{a}{b}<\frac{c}{d}$, то $\frac{a}{b}<\frac{a+c}{b+d}<\frac{c}{d}$.
4. Всех несократимых дробей со знаменателями, равными $n$, имеется в точности $\varphi(n)$ (это известная в теории чисел функция Эйлера). Обозначив через $L_n$ длину последовательности $F_n$, получим рекуррентное соотношение:  
  $L_n=L_{n-1}+\varphi(n)$.

У последовательностей Фарея очень много интересных приложений, в том числе в олимпиадной математике. Существуют различные алгоритмы генерации всех дробей $F_n$, которые исследуются в информатике. Также последовательности Фарея дают интересные темы и для научно-исследовательских работ.

\_\_\_\_\_\_\_\_\_\_

Ответы

1. Ответ:

$$
F_6=\left\lbrace\frac{0}{1},\frac{1}{6},\frac{1}{5},\frac{1}{4},\frac{1}{3},\frac{2}{5},\frac{1}{2},\frac{3}{5},\frac{2}{3},\frac{3}{4},\frac{4}{5},\frac{5}{6},\frac{1}{1}\right\rbrace.
$$

2. Доказательство прямой теоремы индукцией по $n$.

$n=1$, $F_1$ состоит из пары $\frac{0}{1}$ и $\frac{1}{1}$.

$$
1\times 1 - 0\times 1 = 1
$$

Оценим шаг индукции при переходе из $n$ в $n+1$.

Пусть $\frac{a}{b}<\frac{c}{d}$ и $bc-ad=1$. При переходе в следующую последовательность Фарея между ними вставляется медианта $\frac{a+c}{b+d}$. Докажем, что искомое соотношение выполняется и для новых пар.

• Пара $\frac{a}{b}$ и $\frac{a+c}{b+d}$:

$$
b(a + c) - a(b + d) = bc - ad = 1
$$

• Пара $\frac{a+c}{b+d}$ и $\frac{c}{d}$:

$$
(b+d)c-(a+c)d=bc-ad=1
$$





