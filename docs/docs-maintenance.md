# Documentation Maintenance

## Purpose

Документация разделена не по красоте, а по частоте чтения.

Часто читаемые файлы должны быть короткими. Редко читаемые могут быть подробными.

## Reading frequency

| File | Frequency | Size target |
|---|---:|---:|
| `AGENTS.md` | Always | 40–100 lines |
| `docs/architecture-summary.md` | Often | 30–70 lines |
| `docs/project-map.md` | Often | 60–160 lines |
| `docs/task-context.template.md` | Often | 40–120 lines |
| `docs/architecture.md` | Rare | no strict limit |
| `docs/product.md` | Sometimes | moderate |
| `docs/roadmap.md` | Sometimes | compact |

## Update rules

### Update `architecture-summary.md` when

- dependency direction changes;
- layer responsibility changes;
- `Track`, `TrackMeta`, `TrackSource` or `TrackLibrary` role changes;
- a new stable architectural rule appears.

Do not update it for one-off implementation details.

### Update `architecture.md` when

- a new architectural decision is accepted;
- a compromise is introduced;
- data flow changes;
- security/runtime boundary changes;
- a source/integration pattern changes.

### Update `project-map.md` when

- folders are moved;
- major modules are renamed;
- new hotspot appears;
- entry points change.

### Update `product.md` when

- current functionality changes;
- user scenario changes;
- current scope changes;
- constraints change.

### Update `roadmap.md` when

- deferred feature becomes active;
- current milestone changes;
- future functionality is accepted or rejected.

### Update `AGENTS.md` when

- Codex workflow changes;
- test commands change;
- repository navigation rules change;
- new hard constraint appears.

## Anti-patterns

Bad: adding every implementation detail to `architecture-summary.md`; making `AGENTS.md` a full style guide; forcing agents to read `docs/architecture.md` for every task; updating roadmap with current bugs; duplicating product scope in architecture.

Good: short summary for frequent reading; full document for rare decisions; project map for navigation; task context for temporary scope; roadmap only for future/deferred work.
