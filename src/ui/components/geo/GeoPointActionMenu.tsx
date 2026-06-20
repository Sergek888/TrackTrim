import { useEffect, useRef } from 'react'
import type { GeoPointMenuItem } from '../../../application/geo/GeoPointMenuItem'
import GeoPointRow from './GeoPointRow'

type GeoPointActionMenuProps = {
  items: GeoPointMenuItem[]
  onCopy: (value: string) => void
  onOpenExternal: (url: string) => void
  onClose: () => void
}

export default function GeoPointActionMenu({ items, onCopy, onOpenExternal, onClose }: GeoPointActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const coordinateItems = items.filter((item) => item.group === 'coordinates')
  const mapServiceItems = items.filter((item) => item.group === 'map-services')

  return (
    <div className="geo-point-menu" ref={menuRef} role="menu">
      {coordinateItems.length > 0 && (
        <>
          <div className="geo-point-menu-group">Координаты</div>
          {coordinateItems.map((item) => (
            <GeoPointRow
              key={item.id}
              item={item}
              onCopy={onCopy}
            />
          ))}
        </>
      )}
      {mapServiceItems.length > 0 && (
        <>
          <div className="geo-point-menu-group">Карты</div>
          {mapServiceItems.map((item) => (
            <GeoPointRow
              key={item.id}
              item={item}
              onCopy={onCopy}
              onOpenExternal={onOpenExternal}
            />
          ))}
        </>
      )}
    </div>
  )
}
