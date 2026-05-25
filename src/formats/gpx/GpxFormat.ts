import { parseGPX } from '@we-gold/gpxjs'

export type GpxTrackPoint = {
  lat: number
  lon: number
  ele: number | null
  time: Date | null
}

export type GpxReadResult = {
  points: GpxTrackPoint[]
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

  const points: GpxTrackPoint[] = parsedGpx.tracks.flatMap((track) =>
    track.points.map((point) => ({
      lat: point.latitude,
      lon: point.longitude,
      ele: point.elevation,
      time: point.time,
    })),
  )

  return { points }
}
