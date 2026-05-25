import type { GpxTrackPoint } from '../formats/gpx/GpxFormat'

export type TrackStatistics = {
  pointsCount: number
  startTime: Date | null
  finishTime: Date | null
  durationSec: number | null
  distanceKm: number
  averageSpeedKmh: number | null
}

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function distanceMetersBetween(from: GpxTrackPoint, to: GpxTrackPoint): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function getDistanceKm(points: GpxTrackPoint[]): number {
  let distanceM = 0

  for (let index = 1; index < points.length; index += 1) {
    distanceM += distanceMetersBetween(points[index - 1], points[index])
  }

  return distanceM / 1000
}

export function calculateTrackStatistics(points: GpxTrackPoint[]): TrackStatistics | null {
  if (points.length < 2) {
    return null
  }

  const timedPoints = points.filter((point) => point.time !== null)
  const startTime = timedPoints[0]?.time ?? null
  const finishTime = timedPoints[timedPoints.length - 1]?.time ?? null
  const durationSec =
    startTime !== null && finishTime !== null
      ? Math.max(0, (finishTime.getTime() - startTime.getTime()) / 1000)
      : null
  const distanceKm = getDistanceKm(points)
  const averageSpeedKmh =
    durationSec !== null && durationSec > 0 ? distanceKm / (durationSec / 3600) : null

  return {
    pointsCount: points.length,
    startTime,
    finishTime,
    durationSec,
    distanceKm,
    averageSpeedKmh,
  }
}
