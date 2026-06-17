import type { KomootConnectionService } from './KomootConnectionService'
import { createTrackSourceFromAppUrl } from './createTrackSourceFromAppUrl'
import type { TrackSource } from './sources/TrackSource'

export type SourceLinkResult =
  | { readonly kind: 'source'; readonly source: TrackSource }
  | { readonly kind: 'error'; readonly message: string }

export type WorkspaceStartupResult = {
  readonly sourceLink: SourceLinkResult | null
}

export async function resolveWorkspaceStartup(
  komoot: KomootConnectionService,
  options: { readonly appUrl: string; readonly sourceCount: number; readonly defaultColor: string },
  signal?: AbortSignal,
): Promise<WorkspaceStartupResult> {
  await komoot.initialize()

  if (signal?.aborted) {
    return { sourceLink: null }
  }

  return { sourceLink: processSourceLink(komoot, options) }
}

function processSourceLink(
  komoot: KomootConnectionService,
  options: { readonly appUrl: string; readonly sourceCount: number; readonly defaultColor: string },
): SourceLinkResult | null {
  try {
    const source = createTrackSourceFromAppUrl(options.appUrl, {
      color: options.defaultColor,
      order: options.sourceCount,
      komootApi: komoot.publicApi(),
    })

    if (source === null) {
      return null
    }

    return { kind: 'source', source }
  } catch (error) {
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'The source link could not be opened.',
    }
  }
}
