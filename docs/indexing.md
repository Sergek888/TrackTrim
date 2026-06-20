# Indexing

Этот файл фиксирует зоны, которые агенту стоит проверять первыми.

Это не полная карта репозитория. Полная карта — `project-map.md`.

## Highest priority

- `TrackLibrary`
- `TrackSource`
- `Track`
- `TrackPoint`
- `TrackMeta`
- `GpxConverter`
- `src/komoot`
- `api/komoot`
- `src/ui/map`

## Read on demand

- `docs/product.md`
- `docs/roadmap.md`
- `docs/architecture.md`

## Avoid by default

Не читать без причины: весь `src`, все UI-компоненты, все интеграции, полный `docs/architecture.md`, roadmap при UI-задачах, product при технических исправлениях.

## Search hints

Для задач по метаданным искать: `TrackMeta`, `distance`, `duration`, `elevation`, `activity`, `sourceUpdatedAt`.

Для задач по источникам искать: `TrackSource`, `TrackLibrary`, `source`, `visibility`, `order`, `color`.

Для Komoot искать: `KomootApiClient`, `KomootTrackSource`, `transport`, `session`, `proxy`, `tour`, `collection`.

Для GPX искать: `GpxConverter`, `export`, `import`, `elapsedSec`, `time`, `sourceUpdatedAt`.

Для карты искать: `TrackMap`, `map style`, `layer`, `source`, `GeoJSON`, `focus`, `active track`.
