import { X } from 'lucide-react'
import type { TrackSource } from '../../../application/sources/TrackSource'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../../application/sources/KomootTrackSource'
import { defaultTrackColor } from '../../trackColors'
import KomootUrlImportForm from './KomootUrlImportForm'

type KomootImportDialogProps = {
  sourceIndex: number
  userId: string
  displayName: string | null
  onCancel: () => void
  onCreateSource: (source: TrackSource) => void
}

export default function KomootImportDialog({
  sourceIndex,
  userId,
  displayName,
  onCancel,
  onCreateSource,
}: KomootImportDialogProps) {
  function createUserSource(listType: KomootUserListType): void {
    const sourceName =
      displayName === null
        ? `Komoot ${listType === 'planned' ? 'planned' : 'completed'}`
        : `${displayName} ${listType === 'planned' ? 'planned' : 'completed'}`
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
      <section className="add-source-dialog" aria-label="Import from Komoot">
        <header>
          <h2>Import from Komoot</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        <div className="komoot-import-actions">
          <button className="secondary-button" type="button" onClick={() => createUserSource('recorded')}>
            Import completed
          </button>
          <button className="secondary-button" type="button" onClick={() => createUserSource('planned')}>
            Import planned
          </button>
        </div>

        <KomootUrlImportForm
          label="Tour URL"
          placeholder="https://www.komoot.com/tour/123456"
          onImport={createUrlSource}
        />
        <KomootUrlImportForm
          label="Collection URL"
          placeholder="https://www.komoot.com/collection/123456"
          onImport={createUrlSource}
        />
      </section>
    </div>
  )
}

