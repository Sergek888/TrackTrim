import { parseGPX } from '@we-gold/gpxjs'
import { Track } from '../../model/Track'
import type { TrackPoint } from '../../model/TrackPoint'

export type GpxReadResult = {
  track: Track
}

export async function readGpxFile(file: File): Promise<GpxReadResult> {
  let text: string

  try {
    text = await file.text()
  } catch {
    throw new Error('File could not be read.')
  }

  const [parsedGpx, parseError] = parseGPX(text)

  if (parseError !== null) {
    throw new Error('File could not be parsed as GPX.')
  }

  const points: TrackPoint[] = parsedGpx.tracks.flatMap((track) =>
    track.points.map((point) => ({
      lat: point.latitude,
      lon: point.longitude,
      ele: point.elevation,
      time: point.time,
    })),
  )

  return { track: new Track(points) }
}
