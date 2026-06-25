import type {
  KomootConnectionService,
  KomootConnectionState,
} from '../../application/KomootConnectionService'
import Button from '../shared/Button'
import Panel from '../shared/Panel'
import KomootSourceCard from './sources/KomootSourceCard'

type SettingsPanelProps = {
  komootConnection: KomootConnectionState
  onClose: () => void
  onKomootConnect: KomootConnectionService['connect']
  onKomootDisconnect: KomootConnectionService['disconnect']
  onOpenAvailability: () => void
}

export default function SettingsPanel({
  komootConnection,
  onClose,
  onKomootConnect,
  onKomootDisconnect,
  onOpenAvailability,
}: SettingsPanelProps) {
  return (
    <Panel
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

      <section className="settings-section">
        <h3>Map Layers</h3>
        <Button variant="secondary" onClick={onOpenAvailability}>
          Настройка доступности слоёв
        </Button>
      </section>
    </Panel>
  )
}
