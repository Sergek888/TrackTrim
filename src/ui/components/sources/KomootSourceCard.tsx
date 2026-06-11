import { RefreshCw, Unplug, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../../application/sources/TrackSource'
import { defaultTrackColor } from '../../trackColors'
import KomootConnectDialog, { type KomootConnection } from './KomootConnectDialog'
import KomootImportDialog from './KomootImportDialog'

type KomootSourceState = 'not_connected' | 'connecting' | 'connected' | 'expired' | 'error'

type KomootSourceCardProps = {
  sourceIndex: number
  onCreateSource: (source: TrackSource) => void
}

type KomootImportMode = 'all' | 'tour-url' | 'collection-url'

export default function KomootSourceCard({
  sourceIndex,
  onCreateSource,
}: KomootSourceCardProps) {
  const [state, setState] = useState<KomootSourceState>('not_connected')
  const [connection, setConnection] = useState<KomootConnection | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [importMode, setImportMode] = useState<KomootImportMode | null>(null)

  useEffect(() => {
    void checkStatus(false)
  }, [])

  async function checkStatus(showLoading: boolean): Promise<void> {
    if (showLoading) {
      setState('connecting')
    }

    try {
      const response = await fetch('/api/komoot/status')
      const payload = (await response.json()) as KomootConnection

      if (payload.connected) {
        setConnection(payload)
        setState('connected')
        setErrorMessage(null)
        return
      }

      if (payload.expired) {
        setState('expired')
        setConnection(null)
        return
      }

      setState('not_connected')
      setConnection(null)
    } catch {
      setState(connection?.connected === true ? 'connected' : 'not_connected')
      setErrorMessage('Не удалось проверить статус Komoot. Подключение можно запустить вручную.')
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch('/api/komoot/logout', { method: 'POST' })
    setConnection(null)
    setState('not_connected')
  }

  function handleConnected(nextConnection: KomootConnection): void {
    setConnection(nextConnection)
    setState('connected')
    setConnectDialogOpen(false)
  }

  function createUserSource(listType: KomootUserListType): void {
    const userId = connection?.userId

    if (userId === undefined) {
      setErrorMessage('Komoot user id is not known. Import a tour or collection by URL, or add a Komoot user source by profile URL.')
      return
    }

    const label = listType === 'planned' ? 'запланированные' : 'пройденные'
    const source = new KomootTrackSource(
      userId,
      `${connection?.displayName ?? 'Komoot'} ${label}`,
      defaultTrackColor(sourceIndex),
      listType,
      { kind: 'tracktrim-session' },
    )

    source.order = sourceIndex
    onCreateSource(source)
  }

  const userLabel =
    connection?.displayName ?? connection?.userId ?? 'Komoot connected'

  return (
    <section className={`komoot-source-card komoot-source-card-${state}`}>
      <header>
        <div>
          <h2>Komoot</h2>
          <p>{labelForState(state, userLabel, errorMessage)}</p>
        </div>
        {state === 'connected' ? (
          <Wifi aria-hidden="true" size={18} strokeWidth={2.3} />
        ) : (
          <WifiOff aria-hidden="true" size={18} strokeWidth={2.3} />
        )}
      </header>

      {(state === 'not_connected' || state === 'error') && (
        <>
          <p className="form-note">
            Нужно войти в Komoot. Пароль не сохраняется, на backend хранится только сессия.
          </p>
          {errorMessage !== null && <p className="error-message">{errorMessage}</p>}
          <button className="save-button" type="button" onClick={() => setConnectDialogOpen(true)}>
            Подключить Komoot
          </button>
        </>
      )}

      {state === 'connected' && (
        <div className="komoot-source-actions">
          <button className="secondary-button" type="button" onClick={() => void checkStatus(true)}>
            <Wifi aria-hidden="true" size={15} strokeWidth={2.2} />
            Проверить подключение
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportMode('all')}>
            <RefreshCw aria-hidden="true" size={15} strokeWidth={2.2} />
            Обновить список
          </button>
          <button className="secondary-button" type="button" onClick={() => createUserSource('recorded')}>
            Импортировать пройденные
          </button>
          <button className="secondary-button" type="button" onClick={() => createUserSource('planned')}>
            Импортировать запланированные
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportMode('tour-url')}>
            Импортировать трек по ссылке
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportMode('collection-url')}>
            Импортировать коллекцию по ссылке
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
            <Unplug aria-hidden="true" size={15} strokeWidth={2.2} />
            Отключить
          </button>
        </div>
      )}

      {state === 'expired' && (
        <>
          <p className="error-message">Сессия Komoot истекла</p>
          <button className="save-button" type="button" onClick={() => setConnectDialogOpen(true)}>
            Подключить заново
          </button>
        </>
      )}

      {connectDialogOpen && (
        <KomootConnectDialog
          onCancel={() => setConnectDialogOpen(false)}
          onConnected={handleConnected}
        />
      )}

      {importMode !== null && (
        <KomootImportDialog
          mode={importMode}
          sourceIndex={sourceIndex}
          userId={connection?.userId ?? null}
          displayName={connection?.displayName ?? null}
          onCancel={() => setImportMode(null)}
          onCreateSource={(source) => {
            setImportMode(null)
            onCreateSource(source)
          }}
        />
      )}
    </section>
  )
}

function labelForState(
  state: KomootSourceState,
  userLabel: string,
  errorMessage: string | null,
): string {
  if (state === 'connected') {
    return userLabel
  }

  if (state === 'connecting') {
    return 'Проверка подключения...'
  }

  if (state === 'expired') {
    return 'Сессия Komoot истекла'
  }

  if (state === 'error') {
    return errorMessage ?? 'Ошибка подключения Komoot'
  }

  return 'Не подключен'
}
