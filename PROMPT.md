# Промт: Исправить выпадающее меню координат в React

## Контекст проекта

React + TypeScript приложение для просмотра GPS-треков (Vite, CSS без фреймворков).

## Проблема

Компонент `TrackCoordinatesBlock` отображает координаты старта и финиша трека. Каждые координаты — кликабельная ссылка с иконкой. По клику должно открываться выпадающее меню с опциями (копировать координаты в разных форматах, открыть на карте).

**Меню не открывается по клику.** Было перепробовано много вариантов — ничего не помогает.

## Подозрения

1. **CSS конфликт**: `track-tooltip` имеет `position: fixed; z-index: 30`. Возможно, что-то блокирует клики на дочерних элементах.
2. **Глобальные стили**:可能存在 стили, которые влияют на `span[role="button"]` или `span` с `onClick`.
3. **Event propagation**: Возможно, клик перехватывается на каком-то родительском уровне.
4. **React Strict Mode**: Двойной рендер в dev mode может вызывать гонки с `useEffect`.

## Текущая архитектура координат

```
TrackTooltip (aside.surface.track-tooltip, position: fixed, z-index: 30)
  └── TrackCoordinatesBlock
        └── div.track-coordinates-block
              └── div.track-coordinates-row (display: grid, 2 колонки)
                    ├── CoordDropdown (старт)
                    │     └── div.coord-dropdown (position: relative)
                    │           ├── span.track-coordinates-link (role="button", tabIndex=0, onClick)
                    │           └── div.coord-dropdown-menu (position: fixed, z-index: 100) [условный рендер]
                    └── CoordDropdown (финиш)
```

## Текущий код TrackCoordinatesBlock.tsx

```tsx
import { Flag, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TrackMeta } from '../../../model/TrackMeta'
import { buildGeoPointMenuItems } from '../../../application/geo/GeoPointMenuBuilder'
import { formatCoordinate } from '../../../application/geo/CoordinateFormatter'
import { copyText } from '../../external-links/copyText'
import { openExternalUrl } from '../../external-links/openExternalUrl'

type TrackCoordinatesBlockProps = {
  meta: TrackMeta
}

export default function TrackCoordinatesBlock({ meta }: TrackCoordinatesBlockProps) {
  const startPoint = meta.startPoint
  const finishPoint = meta.finishPoint

  if (startPoint === null && finishPoint === null) {
    return null
  }

  return (
    <div className="track-coordinates-block">
      <div className="track-coordinates-row">
        {startPoint !== null && (
          <CoordDropdown
            point={startPoint}
            icon={<MapPin aria-hidden="true" size={12} />}
          />
        )}
        {finishPoint !== null && (
          <CoordDropdown
            point={finishPoint}
            icon={<Flag aria-hidden="true" size={12} />}
          />
        )}
      </div>
    </div>
  )
}

function CoordDropdown({
  point,
  icon,
}: {
  point: NonNullable<TrackMeta['startPoint']>
  icon: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onDown(e: MouseEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !menuRef.current || !wrapRef.current) return

    const m = menuRef.current.getBoundingClientRect()
    const t = wrapRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    let top = t.bottom + 2
    let left = t.left
    if (top + m.height > vh - 8) top = t.top - m.height - 2
    if (top < 8) top = 8
    if (left + m.width > vw - 8) left = vw - m.width - 8
    if (left < 8) left = 8

    menuRef.current.style.top = `${top}px`
    menuRef.current.style.left = `${left}px`
  }, [open])

  const items = buildGeoPointMenuItems(point)

  function handleCopy(value: string): void {
    setOpen(false)
    copyText(value).catch(() => {})
  }

  function handleOpen(url: string): void {
    setOpen(false)
    openExternalUrl(url)
  }

  return (
    <div className="coord-dropdown" ref={wrapRef}>
      <span
        className="track-coordinates-link"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        {icon}
        <span>{formatCoordinate(point, 'decimal')}</span>
        <span className="track-coordinates-chevron">▼</span>
      </span>
      {open && (
        <div className="coord-dropdown-menu" ref={menuRef} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              className="track-coordinates-menu-item"
              type="button"
              role="menuitem"
              onClick={() => {
                if (item.copyValue) handleCopy(item.copyValue)
                if (item.externalUrl) handleOpen(item.externalUrl)
              }}
            >
              <span className="track-coordinates-menu-icon">
                {item.icon === 'copy' ? '⌘' : '↗'}
              </span>
              <span className="track-coordinates-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

## CSS (index.css)

```css
.track-tooltip {
  position: fixed;
  right: auto;
  bottom: 18px;
  left: 18px;
  z-index: 30;
  width: min(380px, calc(100vw - 36px));
  gap: 6px;
}

.track-tooltip > * {
  min-width: 0;
}

.surface {
  border: 1px solid var(--surface-border-color);
  border-radius: var(--radius-surface);
  background: var(--surface-bg);
  backdrop-filter: var(--surface-blur);
  box-shadow: var(--shadow-panel);
  color: var(--color-text);
}

.track-coordinates-block {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.track-coordinates-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.coord-dropdown {
  position: relative;
}

.track-coordinates-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-link);
  white-space: nowrap;
}

.track-coordinates-link:hover {
  text-decoration: underline;
}

.track-coordinates-link svg {
  flex-shrink: 0;
  color: var(--color-muted);
}

.track-coordinates-chevron {
  font-size: 7px;
  color: var(--color-muted);
  margin-left: 2px;
}

.coord-dropdown-menu {
  position: fixed;
  z-index: 100;
  display: grid;
  min-width: 160px;
  max-height: min(320px, 50vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.track-coordinates-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 0 8px;
  text-align: left;
  width: 100%;
}

.track-coordinates-menu-item:hover {
  background: var(--color-panel-soft);
}
```

CSS-переменные:
```css
:root {
  --color-page: #f4f5f8;
  --color-panel: #ffffff;
  --color-panel-soft: #f8fafc;
  --color-text: #172033;
  --color-muted: #64748b;
  --color-border: #e2e8f0;
  --color-accent: #2563eb;
  --color-accent-strong: #1d4ed8;
  --color-danger: #b42318;
  --color-link: #2563eb;
  --shadow-panel: 0 18px 45px rgba(15, 23, 42, 0.18);
  --radius-surface: 16px;
  --surface-border-color: rgba(226, 232, 240, 0.9);
  --surface-bg: rgba(255, 255, 255, 0.96);
  --surface-blur: blur(14px);
}
```

## Задача

1. **Найти причину** почему клик по `span.track-coordinates-link` не вызывает `setOpen(true)`.
2. **Исправить** — меню должно открываться по клику.
3. **Закрытие** — по клику вне меню и по Escape.
4. **Позиционирование** — меню `position: fixed`, вычислять позицию относительно триггера, переворачивать вверх если не хватает места снизу.
5. **Прокрутка** — `max-height` + `overflow-y: auto` для длинных списков.

## Что уже пробовалось (не помогло)

- `<button>` вместо `<span role="button">` — не помогло
- `useLayoutEffect` для позиционирования — не помогло
- `setTimeout(() => ..., 0)` для регистрации document listener — не помогло
- `pointerdown` вместо `mousedown` — не помогло
- Capture phase (`addEventListener('mousedown', fn, true)`) — не помогло
- `justOpenedRef` флаг для предотвращения мгновенного закрытия — не помогло
- `dropdown-backdrop` (невидимый overlay) — не помогло
- Отдельный `Dropdown` компонент — не помогло

## Ограничения

- Не менять `TrackPoint`, `ViewPoint` типы
- Не добавлять новые зависимости (React-only)
- Стили в `index.css`, не CSS modules
- Использовать существующие `copyText` и `openExternalUrl` из `src/ui/external-links/`
- `buildGeoPointMenuItems` из `src/application/geo/` — не менять

## Рабочий пример из того же проекта

В `SourceAccordion.tsx` есть аналогичное выпадающее меню, которое **работает**:

```tsx
// SourceAccordion.tsx — рабочий паттерн
const [menuOpen, setMenuOpen] = useState(false)
const menuRef = useRef<HTMLDivElement | null>(null)

useEffect(() => {
  if (!menuOpen) return
  const close = (event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
  }
  window.addEventListener('pointerdown', close)
  return () => window.removeEventListener('pointerdown', close)
}, [menuOpen])

// JSX:
<div className="source-menu-wrap" ref={menuRef}>
  <IconButton onClick={() => setMenuOpen((open) => !open)}>
    <MoreVertical />
  </IconButton>
  {menuOpen && (
    <div className="surface source-context-menu" role="menu">
      <button onClick={() => { setMenuOpen(false); ... }}>Rename</button>
    </div>
  )}
</div>
```

CSS:
```css
.source-context-menu {
  position: absolute;
  top: 32px;
  right: 0;
  z-index: 75;
  display: grid;
  min-width: 160px;
}
```

**Ключевые отличия от сломанного варианта:**
- Используется `IconButton` (нативный `<button>`) вместо `<span role="button">`
- Меню position: absolute (не fixed) — привязано к родителю
- Слушатель `pointerdown` на `window` (не `document`)
- Обёртка `source-menu-wrap` с `ref` — контейнер для позиционирования
