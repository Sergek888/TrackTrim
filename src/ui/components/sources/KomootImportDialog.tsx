import { X } from 'lucide-react'
import type { TrackSource } from '../../../application/sources/TrackSource'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../../application/sources/KomootTrackSource'
import { defaultTrackColor } from '../../trackColors'
import KomootUrlImportForm from './KomootUrlImportForm'

type KomootImportDialogProps = {
  mode: 'all' | 'tour-url' | 'collection-url'
  sourceIndex: number
  userId: string
  displayName: string | null
  onCancel: () => void
  onCreateSource: (source: TrackSource) => void
}

export default function KomootImportDialog({
  mode,
  sourceIndex,
  userId,
  displayName,
  onCancel,
  onCreateSource,
}: KomootImportDialogProps) {
  function createUserSource(listType: KomootUserListType): void {
    const sourceName =
      displayName === null
        ? `Komoot ${listType === 'planned' ? 'запланированные' : 'пройденные'}`
        : `${displayName} ${listType === 'planned' ? 'запланированные' : 'пройденные'}`
    const source = new KomootTrackSource(
      userId,
      sourceName,
      defaultTrackColor(sourceIndex),
      listType,
      { kind: 'tracktrim-session' },
    )

    source.order = sourceIndex
    onCreateSource(source)
  }

  function createUrlSource(url: string): void {
    const source = new KomootTrackSource(
      url,
      'Komoot source',
      defaultTrackColor(sourceIndex),
      'planned',
      { kind: 'tracktrim-session' },
    )

    source.order = sourceIndex
    onCreateSource(source)
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="add-source-dialog" aria-label="Импорт из Komoot">
        <header>
          <h2>Импорт из Komoot</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        {mode === 'all' && (
          <div className="komoot-import-actions">
            <button className="secondary-button" type="button" onClick={() => createUserSource('recorded')}>
              Импортировать пройденные
            </button>
            <button className="secondary-button" type="button" onClick={() => createUserSource('planned')}>
              Импортировать запланированные
            </button>
          </div>
        )}

        {(mode === 'all' || mode === 'tour-url') && (
          <KomootUrlImportForm
            label="Ссылка на трек"
            placeholder="https://www.komoot.com/tour/123456"
            onImport={createUrlSource}
          />
        )}
        {(mode === 'all' || mode === 'collection-url') && (
          <KomootUrlImportForm
            label="Ссылка на коллекцию"
            placeholder="https://www.komoot.com/collection/123456"
            onImport={createUrlSource}
          />
        )}
      </section>
    </div>
  )
}
