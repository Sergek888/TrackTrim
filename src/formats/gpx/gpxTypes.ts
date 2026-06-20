export type GpxTrackPoint = {
  lat: number
  lon: number
  ele?: number
  time?: string
  extensions?: Record<string, unknown>
}

export type GpxTrackSegment = {
  trkpt: GpxTrackPoint | GpxTrackPoint[]
}

export type GpxTrack = {
  name?: string
  desc?: string
  src?: string
  type?: string
  number?: number
  extensions?: Record<string, unknown>
  trkseg: GpxTrackSegment | GpxTrackSegment[]
}

export type GpxRoute = {
  name?: string
  desc?: string
  type?: string
  rtept: GpxTrackPoint | GpxTrackPoint[]
}

export type GpxWaypoint = {
  lat: number
  lon: number
  ele?: number
  time?: string
  name?: string
  desc?: string
  cmt?: string
  sym?: string
  type?: string
  number?: number
  extensions?: Record<string, unknown>
}

export type GpxMetadata = {
  name?: string
  desc?: string
  author?: { name?: string; email?: { address?: string } }
  time?: string
  links?: Array<{ href: string; text?: string; type?: string }>
  copyright?: { author?: string; year?: number; license?: string }
  bounds?: { minlat?: number; minlon?: number; maxlat?: number; maxlon?: number }
}

export type GpxRoot = {
  version?: string
  creator?: string
  metadata?: GpxMetadata
  wpt?: GpxWaypoint | GpxWaypoint[]
  trk?: GpxTrack | GpxTrack[]
  rte?: GpxRoute | GpxRoute[]
}

export type GpxTrackPointExtensions = {
  'gpxtpx:TrackPointExtension'?: {
    'gpxtpx:hr'?: number
    'gpxtpx:cad'?: number
    'gpxtpx:atemp'?: number
    'gpxpx:power'?: number
  }
  [key: string]: unknown
}
