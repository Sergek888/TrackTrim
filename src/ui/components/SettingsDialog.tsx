import type {
  KomootConnectionService,
  KomootConnectionState,
} from '../../application/KomootConnectionService'
import Dialog from '../shared/Dialog'
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
  return (
    <Dialog
      title="Settings"
      onClose={onClose}
      closeLabel="Close settings"
    >
      <section className="settings-section">
        <h3>Connections</h3>
        <KomootSourceCard
          connection={komootConnection}
          onConnect={onKomootConnect}
          onDisconnect={onKomootDisconnect}
        />
      </section>
    </Dialog>
  )
}
