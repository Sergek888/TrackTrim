# Architecture

## Main principle

Track — основная модель.

GPX — только формат сериализации.

Главный поток:

File
→ format.read()
→ Track
→ application.proposeTrim()
→ TrimProposal
→ user confirmation
→ application.applyTrim()
→ Track
→ format.write()
→ download

## Future modules

src/

    model/

    formats/

    application/

    ui/

## Responsibilities

model:
- универсальная модель трека

formats:
- чтение/запись форматов

application:
- прикладная логика

ui:
- интерфейс

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
