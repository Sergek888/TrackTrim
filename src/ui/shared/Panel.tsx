import type { ReactNode } from 'react'
import IconButton from './IconButton'
import { X } from 'lucide-react'
import './Panel.css'
import './Surface.css'

type PanelProps = {
  id?: string
  title: string
  ariaLabel?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  closeLabel?: string
}

export default function Panel({
  id,
  title,
  ariaLabel,
  onClose,
  children,
  footer,
  className,
  closeLabel = 'Close',
}: PanelProps) {
  const panelClasses = ['surface', 'panel-content']

  if (className) {
    panelClasses.push(className)
  }

  return (
    <div
      className="panel-layer"
      role="presentation"
    >
      <aside
        id={id}
        className={panelClasses.join(' ')}
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
      >
        <header className="panel-header">
          <h2>{title}</h2>
          <IconButton
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </IconButton>
        </header>
        <div className="panel-body">
          {children}
        </div>
        {footer !== undefined && <footer className="panel-footer">{footer}</footer>}
      </aside>
    </div>
  )
}
