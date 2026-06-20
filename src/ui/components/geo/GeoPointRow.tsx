import { Copy, ExternalLink } from 'lucide-react'
import type { GeoPointMenuItem } from '../../../application/geo/GeoPointMenuItem'
import IconButton from '../../shared/IconButton'

type GeoPointRowProps = {
  item: GeoPointMenuItem
  onCopy: (value: string) => void
  onOpenExternal?: (url: string) => void
}

export default function GeoPointRow({ item, onCopy, onOpenExternal }: GeoPointRowProps) {
  function handleClick(): void {
    if (item.disabled) return

    if (item.copyValue) {
      onCopy(item.copyValue)
    }
  }

  function handleExternalClick(e: React.MouseEvent): void {
    e.stopPropagation()

    if (item.externalUrl && onOpenExternal) {
      onOpenExternal(item.externalUrl)
    }
  }

  return (
    <button
      className={`geo-point-row${item.disabled ? ' geo-point-row--disabled' : ''}`}
      type="button"
      role="menuitem"
      onClick={handleClick}
      disabled={item.disabled}
      title={item.disabledReason ?? item.label}
    >
      <span className="geo-point-row-icon">
        {item.icon === 'copy' ? (
          <Copy aria-hidden="true" size={14} />
        ) : (
          <ExternalLink aria-hidden="true" size={14} />
        )}
      </span>
      <span className="geo-point-row-label">{item.label}</span>
      {item.externalUrl && (
        <IconButton
          className="geo-point-row-external"
          variant="ghost"
          type="button"
          aria-label={`Open ${item.label}`}
          title={`Open ${item.label}`}
          onClick={handleExternalClick}
        >
          <span aria-hidden="true">↗</span>
        </IconButton>
      )}
    </button>
  )
}
