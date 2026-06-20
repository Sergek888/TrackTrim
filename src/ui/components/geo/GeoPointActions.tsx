import { useState } from 'react'
import type { GeoPointMenuItem } from '../../../application/geo/GeoPointMenuItem'
import IconButton from '../../shared/IconButton'
import { Copy } from 'lucide-react'
import GeoPointActionMenu from './GeoPointActionMenu'

type GeoPointActionsProps = {
  items: GeoPointMenuItem[]
  onCopy: (value: string) => void
  onOpenExternal: (url: string) => void
}

export default function GeoPointActions({ items, onCopy, onOpenExternal }: GeoPointActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="geo-point-actions">
      <IconButton
        variant="ghost"
        type="button"
        aria-label="Coordinate actions"
        title="Coordinate actions"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Copy aria-hidden="true" size={14} />
      </IconButton>
      {menuOpen && (
        <GeoPointActionMenu
          items={items}
          onCopy={(value) => { setMenuOpen(false); onCopy(value) }}
          onOpenExternal={(url) => { setMenuOpen(false); onOpenExternal(url) }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
