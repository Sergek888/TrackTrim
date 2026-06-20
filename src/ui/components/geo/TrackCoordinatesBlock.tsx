import { ExternalLink, Flag, MapPin } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onDown(e: PointerEvent): void {
      const target = e.target as Node

      if (
        !wrapRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return

    const m = menuRef.current.getBoundingClientRect()
    const t = triggerRef.current.getBoundingClientRect()
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
      <button
        ref={triggerRef}
        className="track-coordinates-link"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        {icon}
        <span>{formatCoordinate(point, 'decimal')}</span>
        <span className="track-coordinates-chevron">{'\u25BC'}</span>
      </button>
      {open && createPortal(
        <div
          className="coord-dropdown-menu"
          ref={menuRef}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {items.map((item) => (
            <div key={item.id} className="track-coordinates-menu-item">
              <button
                className="track-coordinates-menu-item-body"
                type="button"
                role="menuitem"
                onClick={() => {
                  if (item.copyValue) handleCopy(item.copyValue)
                }}
              >
                <span className="track-coordinates-menu-label">{item.label}</span>
              </button>
              {item.externalUrl && (
                <button
                  className="track-coordinates-menu-item-action"
                  type="button"
                  aria-label={`Open in ${item.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpen(item.externalUrl!)
                  }}
                >
                  <ExternalLink size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
