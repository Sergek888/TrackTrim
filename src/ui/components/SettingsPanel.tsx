import type {
  KomootConnectionService,
  KomootConnectionState,
} from '../../application/KomootConnectionService'
import Panel from '../shared/Panel'
import KomootSourceCard from './sources/KomootSourceCard'

type SettingsPanelProps = {
  komootConnection: KomootConnectionState
  onClose: () => void
  onKomootConnect: KomootConnectionService['connect']
  onKomootDisconnect: KomootConnectionService['disconnect']
}

export default function SettingsPanel({
  komootConnection,
  onClose,
  onKomootConnect,
  onKomootDisconnect,
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
    </Panel>
  )
}
