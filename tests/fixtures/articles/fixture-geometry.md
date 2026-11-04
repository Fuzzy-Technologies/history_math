---
layout: article
title: Тест чтения и математической разметки
lang: ru
translation_key: fixture-geometry
date: 2026-09-28
type: essay
author: Test fixture
description: Тестовая публикация для проверки сайта. Сценарий geometry.
tags: [геометрия, идеи]
math: true
status: demo
permalink: /ru/publications/fixture-geometry/
preview_image: /assets/images/example/reading-diagram.svg
cover_image: /assets/images/example/reading-diagram.svg
hero_image: /assets/images/example/reading-diagram.svg
hero_alt: Тестовый геометрический чертёж
hero_caption: Тестовая подпись к чертежу.
---
## Проверка прокрутки

В этом абзаце проверяется возврат к сохранённой позиции чтения. При смене ширины окна строки переносятся, а позиция должна указывать на ту же часть абзаца. Чертёж помогает проверить показ изображения и его подписи. Следующая часть содержит формулы, таблицу и сноску.

## Проверка формул

Обозначим радиус через $r$.

$$
C = 2\pi r, \qquad S = \pi r^2.
$$

Проверочное уравнение $x^2 + y^2 = r^2$.[^fixture]

| Радиус | Длина  | Площадь |
| :----- | :----- | :------ |
| 1      | $2\pi$ | $\pi$   |
| 2      | $4\pi$ | $4\pi$  |

## Источники и дальнейшее чтение

[Связанная тестовая страница]({{ '/ru/publications/fixture-area/' | relative_url }}).

[^fixture]: Тестовая сноска.
