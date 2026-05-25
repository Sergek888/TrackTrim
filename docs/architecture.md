# Architecture

## Main principle

Track — основная модель.

GPX — только формат сериализации.

Главный поток:

File
→ format.read()
→ Track
→ model statistics
→ UI

Будущий поток обрезки:

Track
→ application.proposeTrim()
→ TrimProposal
→ user confirmation
→ application.applyTrim()
→ Track
→ format.write()
→ download

## Modules

src/

    model/

    formats/

    application/

    ui/

## Responsibilities

model:
- содержит Track, TrackPoint, TrackStatistics
- содержит универсальные вычисления по треку
- может считать distance, duration, average speed, intervals
- не знает про GPX, XML, UI, пользователя, автомобиль

formats:
- читает и пишет внешние форматы
- преобразует GPX в Track
- не считает статистику
- не принимает пользовательские решения

application:
- только оркестрирует пользовательские сценарии
- не считает distance/speed/statistics вручную
- вызывает методы model
- может появиться позже для proposeTrim/applyTrim
- не нужен для простой статистики

ui:
- только отображает состояние
- не парсит GPX
- не считает статистику
- не содержит бизнес-логику

## Placement rules

Если функция отвечает на вопрос "что можно вычислить по треку?" — она должна быть в model.

Если функция отвечает на вопрос "что предложить пользователю сделать?" — она должна быть в application.

Если функция отвечает на вопрос "как прочитать/записать файл?" — она должна быть в formats.

Если функция отвечает на вопрос "как показать пользователю?" — она должна быть в ui.

## Restrictions

Track не должен знать:

- GPX
- XML
- UI
- автомобиль
- пользователя

UI не должен:

- анализировать трек
- парсить GPX
- изменять Track
