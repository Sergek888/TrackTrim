# Task Context Template

Используй этот шаблон для задач Codex, чтобы не заставлять агента каждый раз читать весь проект.

```md
# Task Context

## Goal

Коротко: что нужно изменить.

## Scope

Работать только с:

- path/to/file-or-folder
- path/to/another-file

## Read first

- docs/architecture-summary.md
- docs/project-map.md

## Do not read

- docs/architecture.md
- docs/product.md
- docs/roadmap.md
- src/komoot
- api/komoot

Убери из списка то, что реально нужно задаче.

## Constraints

- UI не содержит предметных вычислений.
- Не менять модель без необходимости.
- Не добавлять новые абстракции без реальной причины.
- Не расширять scope без объяснения.

## Success criteria

- Что должно работать.
- Что не должно измениться.
- Какие проверки выполнить.

## Output

В конце коротко указать:

- изменённые файлы;
- выполненные проверки;
- что не проверялось.
```

## Example: UI map task

```md
# Task Context

## Goal

Исправить подсветку активного трека на карте.

## Scope

Работать только с:

- src/ui/map
- src/ui/components/TrackMap.tsx
- related map tests

## Read first

- docs/architecture-summary.md
- docs/project-map.md

## Do not read

- src/komoot
- api/komoot
- docs/product.md
- docs/roadmap.md
- full docs/architecture.md

## Constraints

- Не переносить вычисления в UI.
- Не менять Track, TrackMeta, TrackSource.
- Не трогать GPX import/export.

## Success criteria

- Активный трек визуально отличается.
- Видимость остальных треков не меняется.
- Выбор трека из списка продолжает фокусировать карту.
```
