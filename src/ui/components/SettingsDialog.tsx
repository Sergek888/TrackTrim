import { X } from 'lucide-react'
import { useEffect } from 'react'
import type {
  KomootConnectionService,
  KomootConnectionState,
} from '../../application/KomootConnectionService'
import KomootSourceCard from './sources/KomootSourceCard'

type SettingsDialogProps = {
  komootConnection: KomootConnectionState
  onClose: () => void
  onKomootConnect: KomootConnectionService['connect']
  onKomootDisconnect: KomootConnectionService['disconnect']
}

export default function SettingsDialog({
  komootConnection,
  onClose,
  onKomootConnect,
  onKomootDisconnect,
}: SettingsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="add-source-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Settings">
        <header>
          <h2>Settings</h2>
          <button className="icon-button" type="button" aria-label="Close settings" title="Close" onClick={onClose}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        <section className="settings-section">
          <h3>Connections</h3>
          <KomootSourceCard
            connection={komootConnection}
            onConnect={onKomootConnect}
            onDisconnect={onKomootDisconnect}
          />
        </section>
      </section>
    </div>
  )
}
