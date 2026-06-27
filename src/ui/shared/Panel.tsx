import { ChevronLeft, X } from 'lucide-react'
import type { ReactNode } from 'react'
import IconButton from './IconButton'
import './Panel.css'
import './Surface.css'

type PanelProps = {
  id?: string
  title: string
  ariaLabel?: string
  onClose: () => void
  onBack?: () => void
  backLabel?: string
  children: ReactNode
  footer?: ReactNode
  headerActions?: ReactNode
  className?: string
  closeLabel?: string
}

export default function Panel({
  id,
  title,
  ariaLabel,
  onClose,
  onBack,
  backLabel = 'Back',
  children,
  footer,
  headerActions,
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
          <div className="panel-header-left">
            {onBack !== undefined && (
              <IconButton
                type="button"
                aria-label={backLabel}
                title={backLabel}
                variant="ghost"
                onClick={onBack}
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </IconButton>
            )}
            <h2>{title}</h2>
          </div>
          <div className="panel-header-right">
            {headerActions}
            <IconButton
              type="button"
              aria-label={closeLabel}
              title={closeLabel}
              onClick={onClose}
            >
              <X aria-hidden="true" size={15} strokeWidth={2.2} />
            </IconButton>
          </div>
        </header>
        <div className="panel-body">
          {children}
        </div>
        {footer !== undefined && <footer className="panel-footer">{footer}</footer>}
      </aside>
    </div>
  )
}
