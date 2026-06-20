# Codex Prompts

Готовые запросы для работы с Codex.

## Small UI change

```text
Следуй AGENTS.md.
Считай docs/architecture-summary.md уже изученным.

Работай только с:
- src/ui
- related styles

Не открывай:
- src/komoot
- api/komoot
- formats
- docs/product.md
- docs/roadmap.md

Задача:
...
```

## Map change

```text
Следуй AGENTS.md.
Прочитай docs/project-map.md только для навигации.

Работай только с картой:
- src/ui/map
- TrackMap and related map controls

Не меняй:
- Track
- TrackMeta
- TrackSource
- TrackLibrary
- Komoot
- GPX

Задача:
...
```

## Track metadata change

```text
Следуй AGENTS.md.
Прочитай docs/architecture-summary.md.

Сначала найди текущий поток:
source response -> TrackSource -> Track -> TrackMeta -> UI

Работай только с файлами, которые реально участвуют в этом потоке.

Не меняй модель, если можно решить задачу на уровне adapter / TrackMeta mapping.

Задача:
...
```

## Komoot change

```text
Следуй AGENTS.md.

Работай только с:
- src/komoot
- api/komoot
- Komoot TrackSource adapter

Не открывай UI и карту, если задача не требует изменения отображения.

Соблюдай:
- src/komoot владеет API, DTO, transport, auth and normalize
- api/komoot только runtime adapters and limited proxy
- mutation requests через общий proxy запрещены

Задача:
...
```

## GPX import/export

```text
Следуй AGENTS.md.

Работай только с:
- formats
- GpxConverter
- local file source if needed
- related tests

Не открывай Komoot.

Соблюдай:
- GPX — внешний формат
- formats не управляют UI и сценариями
- elapsedSec не экспортируется как Unix epoch

Задача:
...
```

## Architecture-sensitive change

```text
Следуй AGENTS.md.

Прочитай:
- docs/architecture-summary.md
- docs/architecture.md
- docs/project-map.md

Перед изменениями:
1. назови затронутые границы;
2. объясни, почему существующей сущности недостаточно;
3. предложи минимальный вариант без новой абстракции;
4. только затем меняй код.

Задача:
...
```
