# Project Map

Этот файл помогает быстро выбрать нужную зону проекта без повторного сканирования всего репозитория.

Точная структура файлов может меняться. Карта фиксирует не каждый файл, а смысловые зоны.

## Read first by task type

| Task type | Read first | Usually do not read |
|---|---|---|
| UI / map | `src/ui/map`, map components, related UI components | `src/komoot`, `api/komoot`, full `docs/architecture.md` |
| Track card metadata | `TrackMeta`, source adapters, display formatters | map rendering internals |
| Domain calculations | `model`, `Track`, `TrackPoint`, analysis helpers | UI components |
| GPX import/export | `formats`, `GpxConverter`, local file source | Komoot API internals |
| Komoot integration | `src/komoot`, Komoot `TrackSource`, `api/komoot` | unrelated UI components |
| Track library state | `TrackLibrary`, `TrackSource`, UI consumers | GPX parser internals unless needed |
| Product scope | `docs/product.md`, `docs/roadmap.md` | full codebase |
| Architecture decision | `docs/architecture-summary.md`, then `docs/architecture.md` | unrelated feature files |

## Core zones

### model

Owns: `Track`, `TrackPoint`, `TrackMeta`, universal geometry calculations, derived track operations.

Does not know: GPX, XML, HTTP, Komoot, UI.

### formats

Owns external file parsing/writing and conversion between file format and project model. Current known module: `GpxConverter`.

Does not own UI state, source loading, user scenarios or external service authorization.

### integrations

Owns external systems. Current known integration: `src/komoot`.

Komoot owns auth, users, tours, collections, mutations, import, url parsing, normalize, transport, shared DTO, `KomootApiClient`.

Does not own UI, `TrackLibrary` or browser component state.

### application

Owns user scenarios and workspace state: `TrackSource`, `TrackLibrary`, source adapters, connection state, operations called by UI.

### api runtime

Current known runtime zone: `api/komoot`.

Owns session creation/removal, session status, limited authorized proxy, upload/edit/delete routes, cookies, session store, allowlist.

Does not own tour normalization, parallel application-level Komoot API or UI state.

### ui

Owns display and interaction: map, track list/library UI, controls, dialogs, shared visual components.

UI can format values for display. UI must not compute domain characteristics.

## Known hotspots

- `TrackLibrary`
- `TrackSource`
- `TrackMeta`
- `Track`
- `TrackPoint`
- `GpxConverter`
- `src/komoot`
- `api/komoot`
- `src/ui/map`
- track list / source list UI
- shared UI components

## Data flow map

```text
External API → integration library → TrackSource adapter → TrackMeta / Track → TrackLibrary → UI
Local file → LocalFileTrackSource → GpxConverter → Track → TrackLibrary → UI
```

## Do not scan rules

Do not scan the whole repo for CSS-only visual fixes, map style toggle changes, text formatting, GPX export bugs, Komoot login/status bugs or track metadata display.

Start from the relevant zone. Expand only with a reason.

## When to read full architecture

Read `docs/architecture.md` only when changing dependency direction, adding a new layer/source type, changing `Track`, `TrackMeta`, `TrackSource` or `TrackLibrary`, changing Komoot runtime boundaries, adding analysis/editing/segmentation features, or moving logic between layers.
