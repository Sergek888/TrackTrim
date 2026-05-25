import type { TrackPoint } from './TrackPoint'
import type { TrackStatistics } from './TrackStatistics'

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function distanceMetersBetween(from: TrackPoint, to: TrackPoint): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export class Track {
  public readonly points: TrackPoint[]

  public constructor(points: TrackPoint[]) {
    this.points = points
  }

  public getPoints(): TrackPoint[] {
    return this.points
  }

  public pointsCount(): number {
    return this.points.length
  }

  public firstPoint(): TrackPoint | null {
    return this.points[0] ?? null
  }

  public lastPoint(): TrackPoint | null {
    return this.points[this.points.length - 1] ?? null
  }

  public distanceKm(): number {
    let distanceM = 0

    for (let index = 1; index < this.points.length; index += 1) {
      distanceM += distanceMetersBetween(this.points[index - 1], this.points[index])
    }

    return distanceM / 1000
  }

  public durationSec(): number | null {
    const timedPoints = this.points.filter((point) => point.time !== null)
    const startTime = timedPoints[0]?.time ?? null
    const finishTime = timedPoints[timedPoints.length - 1]?.time ?? null

    if (startTime === null || finishTime === null) {
      return null
    }

    return Math.max(0, (finishTime.getTime() - startTime.getTime()) / 1000)
  }

  public averageSpeedKmh(): number | null {
    const durationSec = this.durationSec()

    if (durationSec === null || durationSec === 0) {
      return null
    }

    return this.distanceKm() / (durationSec / 3600)
  }

  public statistics(): TrackStatistics | null {
    if (this.points.length < 2) {
      return null
    }

    const timedPoints = this.points.filter((point) => point.time !== null)

    return {
      pointsCount: this.pointsCount(),
      startTime: timedPoints[0]?.time ?? null,
      finishTime: timedPoints[timedPoints.length - 1]?.time ?? null,
      durationSec: this.durationSec(),
      distanceKm: this.distanceKm(),
      averageSpeedKmh: this.averageSpeedKmh(),
    }
  }
}
