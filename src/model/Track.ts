import {
  DEFAULT_SPEED_SEGMENTATION_OPTIONS,
  type SpeedSegmentationOptions,
} from './SpeedSegmentationOptions'
import type { TrackMeta } from './TrackMeta'
import type { TrackPoint, TrackPointInput } from './TrackPoint'
import { TrackInterval } from './TrackInterval'
import type { TrackStatistics } from './TrackStatistics'

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function distanceMetersBetween(from: TrackPointInput, to: TrackPointInput): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function secondsBetween(from: TrackPoint, to: TrackPoint): number | null {
  if (from.time === null || to.time === null) {
    return null
  }

  return Math.max(0, (to.time.getTime() - from.time.getTime()) / 1000)
}

function speedKmh(distanceKm: number, durationSec: number): number | null {
  if (durationSec <= 0) {
    return null
  }

  return distanceKm / (durationSec / 3600)
}

type PointSpeedSample = {
  fromIndex: number
  toIndex: number
  durationSec: number
  distanceKm: number
  speedKmh: number
}

export type FindSpeedIntervalsOptions = {
  minSpeedKmh?: number
  maxSpeedKmh?: number
  minDurationSec?: number
}

type PauseCandidate = {
  fromIndex: number
  toIndex: number
}

function matchesSpeedOptions(segment: PointSpeedSample, options: FindSpeedIntervalsOptions): boolean {
  const matchesMinSpeed =
    options.minSpeedKmh === undefined || segment.speedKmh >= options.minSpeedKmh
  const matchesMaxSpeed =
    options.maxSpeedKmh === undefined || segment.speedKmh <= options.maxSpeedKmh

  return matchesMinSpeed && matchesMaxSpeed
}

function createInterval(segments: PointSpeedSample[]): TrackInterval | null {
  if (segments.length === 0) {
    return null
  }

  const durationSec = segments.reduce((total, segment) => total + segment.durationSec, 0)
  const distanceKm = segments.reduce((total, segment) => total + segment.distanceKm, 0)

  return new TrackInterval({
    fromIndex: segments[0].fromIndex,
    toIndex: segments[segments.length - 1].toIndex,
    durationSec,
    distanceKm,
    segmentSpeedsKmh: segments.map((segment) => segment.speedKmh),
  })
}

export class Track {
  private readonly trackPoints: readonly TrackPoint[]

  public constructor(
    points: TrackPointInput[],
    public readonly meta: TrackMeta | null = null,
  ) {
    this.trackPoints = this.createTrackPoints(points)
  }

  public getPoints(): readonly TrackPoint[] {
    return this.trackPoints
  }

  public pointsCount(): number {
    return this.trackPoints.length
  }

  public firstPoint(): TrackPoint | null {
    return this.trackPoints[0] ?? null
  }

  public lastPoint(): TrackPoint | null {
    return this.trackPoints[this.trackPoints.length - 1] ?? null
  }

  public point(index: number): TrackPoint | null {
    return this.trackPoints[index] ?? null
  }

  public distanceKm(): number {
    return this.trackPoints[this.trackPoints.length - 1]?.distanceFromStartKm ?? 0
  }

  public durationSec(): number | null {
    const timedPoints = this.trackPoints.filter((point) => point.time !== null)
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

  public elevationGainM(): number | null {
    let elevationGainM = 0
    let measuredSegments = 0

    for (let index = 1; index < this.trackPoints.length; index += 1) {
      const previousElevation = this.trackPoints[index - 1].ele
      const currentElevation = this.trackPoints[index].ele

      if (previousElevation === null || currentElevation === null) {
        continue
      }

      measuredSegments += 1
      elevationGainM += Math.max(0, currentElevation - previousElevation)
    }

    return measuredSegments === 0 ? null : elevationGainM
  }

  public segmentUntilTimeFromStart(cutFromEndSec: number): Track {
    const durationSec = this.durationSec()

    if (durationSec === null) {
      return this
    }

    const visibleUntilSec = durationSec - cutFromEndSec

    if (visibleUntilSec <= 0) {
      const firstPoint = this.trackPoints[0] ?? null

      return new Track(firstPoint === null ? [] : [this.copyPointInput(firstPoint)], this.meta)
    }

    return new Track(
      this.trackPoints
        .filter((point) => point.elapsedSec !== null && point.elapsedSec <= visibleUntilSec)
        .map((point) => this.copyPointInput(point)),
      this.meta,
    )
  }

  public segmentFromTimeFromStart(startFromStartSec: number): Track {
    const startIndex = this.trackPoints.findIndex(
      (point) => point.elapsedSec !== null && point.elapsedSec >= startFromStartSec,
    )

    if (startIndex === -1) {
      const lastPoint = this.lastPoint()

      return new Track(lastPoint === null ? [] : [this.copyPointInput(lastPoint)], this.meta)
    }

    const segmentStartIndex = Math.max(0, startIndex - 1)

    return new Track(
      this.trackPoints
        .slice(segmentStartIndex)
        .map((point) => this.copyPointInput(point)),
      this.meta,
    )
  }

  public closestPointIndex(latitude: number, longitude: number): number {
    if (this.trackPoints.length === 0) {
      return -1
    }

    let closestIndex = 0
    let closestDistanceMeters = Number.POSITIVE_INFINITY

    for (let index = 0; index < this.trackPoints.length; index += 1) {
      const point = this.trackPoints[index]
      const distanceMeters = distanceMetersBetween(
        { lat: latitude, lon: longitude, ele: null, time: null },
        point,
      )

      if (distanceMeters < closestDistanceMeters) {
        closestDistanceMeters = distanceMeters
        closestIndex = index
      }
    }

    return closestIndex
  }

  public closestPointIndexByElapsedSec(elapsedSec: number): number {
    let closestIndex = -1
    let closestDifferenceSec = Number.POSITIVE_INFINITY

    for (let index = 0; index < this.trackPoints.length; index += 1) {
      const pointElapsedSec = this.trackPoints[index].elapsedSec

      if (pointElapsedSec === null) {
        continue
      }

      const differenceSec = Math.abs(pointElapsedSec - elapsedSec)

      if (differenceSec < closestDifferenceSec) {
        closestDifferenceSec = differenceSec
        closestIndex = index
      }
    }

    return closestIndex
  }

  public segmentUntilIndex(index: number): Track {
    if (this.trackPoints.length === 0) {
      return new Track([], this.meta)
    }

    const endIndex = Math.max(0, Math.min(index, this.trackPoints.length - 1))

    return new Track(
      this.trackPoints
        .slice(0, endIndex + 1)
        .map((point) => this.copyPointInput(point)),
      this.meta,
    )
  }

  public segmentFromIndex(index: number): Track {
    if (this.trackPoints.length === 0) {
      return new Track([], this.meta)
    }

    const startIndex = Math.max(0, Math.min(index, this.trackPoints.length - 1))

    return new Track(
      this.trackPoints
        .slice(startIndex)
        .map((point) => this.copyPointInput(point)),
      this.meta,
    )
  }

  public averageSpeedBetween(fromIndex: number, toIndex: number): number | null {
    const durationSec = this.durationBetween(fromIndex, toIndex)

    if (durationSec === null || durationSec <= 0) {
      return null
    }

    return this.distanceBetween(fromIndex, toIndex) / (durationSec / 3600)
  }

  public statistics(intervals?: readonly TrackInterval[]): TrackStatistics | null {
    if (this.trackPoints.length < 2) {
      return null
    }

    const timedPoints = this.trackPoints.filter((point) => point.time !== null)
    const options = this.resolveSpeedSegmentationOptions()
    const pauses =
      intervals?.filter((interval) => interval.kind === 'pause') ??
      this.findPauseIntervals(0, this.trackPoints.length - 1, options)
    const pauseDurationSec = pauses.reduce((total, pause) => total + pause.durationSec, 0)
    const durationSec = this.durationSec()
    const movingDurationSec =
      durationSec === null ? null : Math.max(0, durationSec - pauseDurationSec)
    const movingAverageSpeedKmh =
      movingDurationSec === null || movingDurationSec === 0
        ? null
        : this.distanceKm() / (movingDurationSec / 3600)

    return {
      pointsCount: this.pointsCount(),
      startTime: timedPoints[0]?.time ?? null,
      finishTime: timedPoints[timedPoints.length - 1]?.time ?? null,
      durationSec,
      pauseCount: pauses.length,
      pauseDurationSec,
      movingDurationSec,
      distanceKm: this.distanceKm(),
      averageSpeedKmh: this.averageSpeedKmh(),
      movingAverageSpeedKmh,
    }
  }

  public speedSegments(options?: Partial<SpeedSegmentationOptions>): TrackInterval[] {
    if (this.trackPoints.length === 0) {
      return []
    }

    const resolvedOptions = this.resolveSpeedSegmentationOptions(options)

    const intervals = this.normalizeSpeedIntervals(
      this.createSpeedIntervalsWithPauses(
        0,
        this.trackPoints.length - 1,
        resolvedOptions,
      ),
      resolvedOptions,
    )

    this.validateSpeedIntervals(intervals, 0, this.trackPoints.length - 1, resolvedOptions)

    return intervals
  }

  private resolveSpeedSegmentationOptions(
    options?: Partial<SpeedSegmentationOptions>,
  ): SpeedSegmentationOptions {
    return {
      minSpeedDifferenceKmh:
        options?.minSpeedDifferenceKmh ??
        DEFAULT_SPEED_SEGMENTATION_OPTIONS.minSpeedDifferenceKmh,
      minSegmentDurationSec:
        options?.minSegmentDurationSec ??
        DEFAULT_SPEED_SEGMENTATION_OPTIONS.minSegmentDurationSec,
      minSegmentDistanceKm:
        options?.minSegmentDistanceKm ??
        DEFAULT_SPEED_SEGMENTATION_OPTIONS.minSegmentDistanceKm,
      minSegmentPoints:
        options?.minSegmentPoints ?? DEFAULT_SPEED_SEGMENTATION_OPTIONS.minSegmentPoints,
      pauseWindowDurationSec:
        options?.pauseWindowDurationSec ??
        DEFAULT_SPEED_SEGMENTATION_OPTIONS.pauseWindowDurationSec,
      pauseMinDurationSec:
        options?.pauseMinDurationSec ?? DEFAULT_SPEED_SEGMENTATION_OPTIONS.pauseMinDurationSec,
      pauseMaxDistanceKm:
        options?.pauseMaxDistanceKm ?? DEFAULT_SPEED_SEGMENTATION_OPTIONS.pauseMaxDistanceKm,
      pauseMaxAverageSpeedKmh:
        options?.pauseMaxAverageSpeedKmh ??
        DEFAULT_SPEED_SEGMENTATION_OPTIONS.pauseMaxAverageSpeedKmh,
      pauseMergeGapSec:
        options?.pauseMergeGapSec ?? DEFAULT_SPEED_SEGMENTATION_OPTIONS.pauseMergeGapSec,
      debug: options?.debug ?? DEFAULT_SPEED_SEGMENTATION_OPTIONS.debug,
    }
  }

  private createTrackPoints(points: TrackPointInput[]): TrackPoint[] {
    const startTime = points[0]?.time ?? null
    let distanceFromStartKm = 0

    return points.map((point, index) => {
      if (index > 0) {
        distanceFromStartKm += distanceMetersBetween(points[index - 1], point) / 1000
      }

      const elapsedSec =
        startTime !== null && point.time !== null
          ? Math.max(0, (point.time.getTime() - startTime.getTime()) / 1000)
          : null

      return {
        ...point,
        elapsedSec,
        distanceFromStartKm,
      }
    })
  }

  private copyPointInput(point: TrackPoint): TrackPointInput {
    return {
      lat: point.lat,
      lon: point.lon,
      ele: point.ele,
      time: point.time === null ? null : new Date(point.time.getTime()),
    }
  }

  private pointSpeedSamples(): PointSpeedSample[] {
    const segments: PointSpeedSample[] = []

    for (let index = 1; index < this.trackPoints.length; index += 1) {
      const fromPoint = this.trackPoints[index - 1]
      const toPoint = this.trackPoints[index]
      const durationSec = secondsBetween(fromPoint, toPoint)

      if (durationSec === null || durationSec === 0) {
        continue
      }

      const distanceKm = distanceMetersBetween(fromPoint, toPoint) / 1000
      const segmentSpeedKmh = speedKmh(distanceKm, durationSec)

      if (segmentSpeedKmh === null) {
        continue
      }

      segments.push({
        fromIndex: index - 1,
        toIndex: index,
        durationSec,
        distanceKm,
        speedKmh: segmentSpeedKmh,
      })
    }

    return segments
  }

  private splitSpeedInterval(
    fromIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): TrackInterval[] {
    const segment = this.createSpeedInterval(fromIndex, toIndex)

    if (segment === null) {
      return []
    }

    if (this.shouldStopSegmentation(segment, options)) {
      return [segment]
    }

    let bestSplitIndex: number | null = null
    let maxSpeedDifferenceKmh = 0
    let bestSplitDetails: {
      durationLeftSec: number
      durationRightSec: number
      distanceLeftKm: number
      distanceRightKm: number
      speedLeftKmh: number
      speedRightKmh: number
      deltaKmh: number
      score: number
    } | null = null

    for (let splitIndex = fromIndex + 1; splitIndex < toIndex; splitIndex += 1) {
      const leftPointsCount = splitIndex - fromIndex + 1
      const rightPointsCount = toIndex - splitIndex + 1
      const durationLeftSec = this.durationBetween(fromIndex, splitIndex)
      const durationRightSec = this.durationBetween(splitIndex, toIndex)
      const distanceLeftKm = this.distanceBetween(fromIndex, splitIndex)
      const distanceRightKm = this.distanceBetween(splitIndex, toIndex)

      if (
        leftPointsCount < options.minSegmentPoints ||
        rightPointsCount < options.minSegmentPoints ||
        durationLeftSec === null ||
        durationRightSec === null ||
        durationLeftSec < options.minSegmentDurationSec ||
        durationRightSec < options.minSegmentDurationSec ||
        distanceLeftKm < options.minSegmentDistanceKm ||
        distanceRightKm < options.minSegmentDistanceKm
      ) {
        continue
      }

      const speedBefore = speedKmh(distanceLeftKm, durationLeftSec)
      const speedAfter = speedKmh(distanceRightKm, durationRightSec)

      if (speedBefore === null || speedAfter === null) {
        continue
      }

      const speedDifferenceKmh = Math.abs(speedBefore - speedAfter)

      if (speedDifferenceKmh > maxSpeedDifferenceKmh) {
        maxSpeedDifferenceKmh = speedDifferenceKmh
        bestSplitIndex = splitIndex
        bestSplitDetails = {
          durationLeftSec,
          durationRightSec,
          distanceLeftKm,
          distanceRightKm,
          speedLeftKmh: speedBefore,
          speedRightKmh: speedAfter,
          deltaKmh: speedDifferenceKmh,
          score: speedDifferenceKmh,
        }
      }
    }

    if (
      bestSplitIndex === null ||
      maxSpeedDifferenceKmh < options.minSpeedDifferenceKmh
    ) {
      return [segment]
    }

    if (options.debug && bestSplitDetails !== null) {
      console.debug('[Track.speedSegments] accepted split', {
        startIndex: fromIndex,
        splitIndex: bestSplitIndex,
        endIndex: toIndex,
        durationLeftSec: bestSplitDetails.durationLeftSec,
        durationRightSec: bestSplitDetails.durationRightSec,
        distanceLeftKm: bestSplitDetails.distanceLeftKm,
        distanceRightKm: bestSplitDetails.distanceRightKm,
        speedLeftKmh: bestSplitDetails.speedLeftKmh,
        speedRightKmh: bestSplitDetails.speedRightKmh,
        deltaKmh: bestSplitDetails.deltaKmh,
        score: bestSplitDetails.score,
        minDurationSec: options.minSegmentDurationSec,
        minDistanceKm: options.minSegmentDistanceKm,
      })
    }

    return [
      ...this.splitSpeedInterval(fromIndex, bestSplitIndex, options),
      ...this.splitSpeedInterval(bestSplitIndex, toIndex, options),
    ]
  }

  private shouldStopSegmentation(
    segment: TrackInterval,
    options: SpeedSegmentationOptions,
  ): boolean {
    const pointsCount = segment.toIndex - segment.fromIndex + 1

    return (
      pointsCount < options.minSegmentPoints ||
      segment.durationSec < options.minSegmentDurationSec ||
      segment.distanceKm < options.minSegmentDistanceKm ||
      segment.averageSpeedKmh() <= 0
    )
  }

  private createSpeedInterval(fromIndex: number, toIndex: number): TrackInterval | null {
    const durationSec = this.durationBetween(fromIndex, toIndex)
    const distanceKm = this.distanceBetween(fromIndex, toIndex)

    if (durationSec === null || durationSec <= 0) {
      return null
    }

    return new TrackInterval({
      fromIndex,
      toIndex,
      durationSec,
      distanceKm,
      segmentSpeedsKmh: [distanceKm / (durationSec / 3600)],
    })
  }

  private createPauseInterval(fromIndex: number, toIndex: number): TrackInterval | null {
    const durationSec = this.durationBetween(fromIndex, toIndex)
    const distanceKm = this.distanceBetween(fromIndex, toIndex)

    if (durationSec === null || durationSec <= 0) {
      return null
    }

    return new TrackInterval({
      fromIndex,
      toIndex,
      durationSec,
      distanceKm,
      kind: 'pause',
      segmentSpeedsKmh: [0],
    })
  }

  private createSpeedIntervalsWithPauses(
    fromIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): TrackInterval[] {
    const pauses = this.findPauseIntervals(fromIndex, toIndex, options)
    const intervals: TrackInterval[] = []
    let currentStartIndex = fromIndex

    for (const pause of pauses) {
      if (currentStartIndex < pause.fromIndex) {
        intervals.push(
          ...this.splitSpeedInterval(currentStartIndex, pause.fromIndex, options),
        )
      }

      intervals.push(pause)
      currentStartIndex = pause.toIndex
    }

    if (currentStartIndex < toIndex) {
      intervals.push(...this.splitSpeedInterval(currentStartIndex, toIndex, options))
    }

    return intervals
  }

  private findPauseIntervals(
    fromIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): TrackInterval[] {
    const candidates: PauseCandidate[] = []
    let startIndex = fromIndex

    while (startIndex < toIndex) {
      const windowEndIndex = this.findPauseWindowEndIndex(startIndex, toIndex, options)

      if (windowEndIndex === null) {
        startIndex += 1
        continue
      }

      const pauseEndIndex = this.expandPauseEndIndex(startIndex, windowEndIndex, toIndex, options)

      candidates.push({
        fromIndex: startIndex,
        toIndex: pauseEndIndex,
      })

      startIndex = pauseEndIndex
    }

    return this.mergeAndFilterPauseCandidates(candidates, options)
      .map((pause) => this.createPauseInterval(pause.fromIndex, pause.toIndex))
      .filter((pause): pause is TrackInterval => pause !== null)
  }

  private findPauseWindowEndIndex(
    startIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): number | null {
    const startPoint = this.trackPoints[startIndex]

    if (startPoint === undefined) {
      return null
    }

    let bestEndIndex: number | null = null
    let maxDistanceFromStartKm = 0

    for (let endIndex = startIndex + 1; endIndex <= toIndex; endIndex += 1) {
      const point = this.trackPoints[endIndex]

      if (point === undefined) {
        continue
      }

      const durationSec = this.durationBetween(startIndex, endIndex)

      if (durationSec === null) {
        continue
      }

      if (durationSec > options.pauseWindowDurationSec) {
        break
      }

      maxDistanceFromStartKm = Math.max(
        maxDistanceFromStartKm,
        distanceMetersBetween(startPoint, point) / 1000,
      )

      if (maxDistanceFromStartKm > options.pauseMaxDistanceKm) {
        break
      }

      if (durationSec < options.pauseMinDurationSec) {
        continue
      }

      const averageSpeedKmh = this.averageSpeedBetween(startIndex, endIndex)

      if (averageSpeedKmh !== null && averageSpeedKmh <= options.pauseMaxAverageSpeedKmh) {
        bestEndIndex = endIndex
      }
    }

    return bestEndIndex
  }

  private expandPauseEndIndex(
    startIndex: number,
    windowEndIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): number {
    const startPoint = this.trackPoints[startIndex]

    if (startPoint === undefined) {
      return windowEndIndex
    }

    let pauseEndIndex = windowEndIndex
    let maxDistanceFromStartKm = this.maxDistanceFromPointKm(startIndex, windowEndIndex)

    for (let endIndex = windowEndIndex + 1; endIndex <= toIndex; endIndex += 1) {
      const point = this.trackPoints[endIndex]

      if (point === undefined) {
        continue
      }

      maxDistanceFromStartKm = Math.max(
        maxDistanceFromStartKm,
        distanceMetersBetween(startPoint, point) / 1000,
      )

      const averageSpeedKmh = this.averageSpeedBetween(startIndex, endIndex)

      if (
        maxDistanceFromStartKm > options.pauseMaxDistanceKm ||
        averageSpeedKmh === null ||
        averageSpeedKmh > options.pauseMaxAverageSpeedKmh
      ) {
        break
      }

      pauseEndIndex = endIndex
    }

    return pauseEndIndex
  }

  private maxDistanceFromPointKm(fromIndex: number, toIndex: number): number {
    const fromPoint = this.trackPoints[fromIndex]

    if (fromPoint === undefined) {
      return 0
    }

    let maxDistanceKm = 0

    for (let index = fromIndex + 1; index <= toIndex; index += 1) {
      const point = this.trackPoints[index]

      if (point === undefined) {
        continue
      }

      maxDistanceKm = Math.max(maxDistanceKm, distanceMetersBetween(fromPoint, point) / 1000)
    }

    return maxDistanceKm
  }

  private mergeAndFilterPauseCandidates(
    candidates: readonly PauseCandidate[],
    options: SpeedSegmentationOptions,
  ): PauseCandidate[] {
    const merged: PauseCandidate[] = []

    for (const candidate of candidates) {
      const previous = merged[merged.length - 1] ?? null

      if (previous === null) {
        merged.push({ ...candidate })
        continue
      }

      const gapDurationSec = this.durationBetween(previous.toIndex, candidate.fromIndex)

      if (gapDurationSec !== null && gapDurationSec <= options.pauseMergeGapSec) {
        previous.toIndex = candidate.toIndex
        continue
      }

      merged.push({ ...candidate })
    }

    return merged.filter((candidate) => {
      const durationSec = this.durationBetween(candidate.fromIndex, candidate.toIndex)

      return durationSec !== null && durationSec >= options.pauseMinDurationSec
    })
  }

  private validateSpeedIntervals(
    intervals: readonly TrackInterval[],
    fromIndex: number,
    toIndex: number,
    options: SpeedSegmentationOptions,
  ): void {
    const firstInterval = intervals[0] ?? null
    const lastInterval = intervals[intervals.length - 1] ?? null

    if (firstInterval !== null && firstInterval.fromIndex !== fromIndex) {
      console.warn('BUG: speed segments do not start at requested index', {
        expectedFromIndex: fromIndex,
        actualFromIndex: firstInterval.fromIndex,
      })
    }

    if (lastInterval !== null && lastInterval.toIndex !== toIndex) {
      console.warn('BUG: speed segments do not end at requested index', {
        expectedToIndex: toIndex,
        actualToIndex: lastInterval.toIndex,
      })
    }

    for (const interval of intervals) {
      if (
        interval.kind !== 'pause' &&
        interval.durationSec < options.minSegmentDurationSec
      ) {
        console.warn('BUG: created segment shorter than MIN_DURATION', {
          fromIndex: interval.fromIndex,
          toIndex: interval.toIndex,
          durationSec: interval.durationSec,
          minDurationSec: options.minSegmentDurationSec,
        })
      }

      if (
        interval.kind !== 'pause' &&
        interval.distanceKm < options.minSegmentDistanceKm
      ) {
        console.warn('BUG: created segment shorter than MIN_DISTANCE', {
          fromIndex: interval.fromIndex,
          toIndex: interval.toIndex,
          distanceKm: interval.distanceKm,
          minDistanceKm: options.minSegmentDistanceKm,
        })
      }
    }

    for (let index = 1; index < intervals.length; index += 1) {
      const previous = intervals[index - 1]
      const current = intervals[index]

      if (previous.toIndex !== current.fromIndex) {
        console.warn('BUG: speed segments are not contiguous', {
          previousFromIndex: previous.fromIndex,
          previousToIndex: previous.toIndex,
          currentFromIndex: current.fromIndex,
          currentToIndex: current.toIndex,
        })
      }

      if (previous.kind !== 'pause' && current.kind !== 'pause') {
        const speedDifferenceKmh = Math.abs(
          previous.averageSpeedKmh() - current.averageSpeedKmh(),
        )

        if (speedDifferenceKmh < options.minSpeedDifferenceKmh) {
          console.warn('BUG: adjacent speed segments differ less than MIN_SPEED_DIFFERENCE', {
            previousFromIndex: previous.fromIndex,
            previousToIndex: previous.toIndex,
            currentFromIndex: current.fromIndex,
            currentToIndex: current.toIndex,
            speedDifferenceKmh,
            minSpeedDifferenceKmh: options.minSpeedDifferenceKmh,
          })
        }
      }
    }
  }

  private normalizeSpeedIntervals(
    intervals: readonly TrackInterval[],
    options: SpeedSegmentationOptions,
  ): TrackInterval[] {
    let normalized = [...intervals]
    let changed = true

    while (changed) {
      changed = false

      for (let index = 1; index < normalized.length; index += 1) {
        const previous = normalized[index - 1]
        const current = normalized[index]

        if (previous.toIndex !== current.fromIndex) {
          continue
        }

        if (this.shouldMergeIntervals(previous, current, options)) {
          if (options.debug) {
            console.debug('[Track.speedSegments] merged intervals', {
              leftKind: previous.kind,
              leftFromIndex: previous.fromIndex,
              leftToIndex: previous.toIndex,
              leftDurationSec: previous.durationSec,
              leftDistanceKm: previous.distanceKm,
              leftAverageSpeedKmh: previous.averageSpeedKmh(),
              rightKind: current.kind,
              rightFromIndex: current.fromIndex,
              rightToIndex: current.toIndex,
              rightDurationSec: current.durationSec,
              rightDistanceKm: current.distanceKm,
              rightAverageSpeedKmh: current.averageSpeedKmh(),
              minDurationSec: options.minSegmentDurationSec,
              minDistanceKm: options.minSegmentDistanceKm,
              minSpeedDifferenceKmh: options.minSpeedDifferenceKmh,
            })
          }

          normalized = [
            ...normalized.slice(0, index - 1),
            this.mergeIntervals(previous, current),
            ...normalized.slice(index + 1),
          ]
          changed = true
          break
        }
      }
    }

    if (
      normalized.length === 1 &&
      normalized[0].kind !== 'pause' &&
      this.isShortOrdinaryInterval(normalized[0], options)
    ) {
      if (options.debug) {
        console.debug('[Track.speedSegments] dropped short speed interval', {
          fromIndex: normalized[0].fromIndex,
          toIndex: normalized[0].toIndex,
          durationSec: normalized[0].durationSec,
          distanceKm: normalized[0].distanceKm,
          minDurationSec: options.minSegmentDurationSec,
          minDistanceKm: options.minSegmentDistanceKm,
        })
      }

      return []
    }

    return normalized
  }

  private shouldMergeIntervals(
    previous: TrackInterval,
    current: TrackInterval,
    options: SpeedSegmentationOptions,
  ): boolean {
    const previousIsShort = this.isShortOrdinaryInterval(previous, options)
    const currentIsShort = this.isShortOrdinaryInterval(current, options)

    if (previousIsShort || currentIsShort) {
      return true
    }

    if (previous.kind === 'pause' || current.kind === 'pause') {
      return false
    }

    return (
      Math.abs(previous.averageSpeedKmh() - current.averageSpeedKmh()) <
      options.minSpeedDifferenceKmh
    )
  }

  private isShortOrdinaryInterval(
    interval: TrackInterval,
    options: SpeedSegmentationOptions,
  ): boolean {
    return (
      interval.kind !== 'pause' &&
      (interval.durationSec < options.minSegmentDurationSec ||
        interval.distanceKm < options.minSegmentDistanceKm)
    )
  }

  private mergeIntervals(left: TrackInterval, right: TrackInterval): TrackInterval {
    const durationSec = this.durationBetween(left.fromIndex, right.toIndex)
    const distanceKm = this.distanceBetween(left.fromIndex, right.toIndex)

    return new TrackInterval({
      fromIndex: left.fromIndex,
      toIndex: right.toIndex,
      durationSec: durationSec ?? left.durationSec + right.durationSec,
      distanceKm,
      kind: left.kind === 'pause' || right.kind === 'pause' ? 'pause' : 'speed',
      segmentSpeedsKmh: [left.averageSpeedKmh(), right.averageSpeedKmh()],
    })
  }

  private durationBetween(fromIndex: number, toIndex: number): number | null {
    const fromElapsedSec = this.trackPoints[fromIndex]?.elapsedSec ?? null
    const toElapsedSec = this.trackPoints[toIndex]?.elapsedSec ?? null

    if (fromElapsedSec === null || toElapsedSec === null || toIndex <= fromIndex) {
      return null
    }

    return toElapsedSec - fromElapsedSec
  }

  private distanceBetween(fromIndex: number, toIndex: number): number {
    const fromDistanceKm = this.trackPoints[fromIndex]?.distanceFromStartKm ?? 0
    const toDistanceKm = this.trackPoints[toIndex]?.distanceFromStartKm ?? fromDistanceKm

    return Math.max(0, toDistanceKm - fromDistanceKm)
  }

  public findSpeedIntervals(options: FindSpeedIntervalsOptions): TrackInterval[] {
    const minDurationSec = options.minDurationSec ?? 0
    const intervals: TrackInterval[] = []
    let currentSegments: PointSpeedSample[] = []

    const flushCurrentInterval = (): void => {
      const interval = createInterval(currentSegments)

      if (interval !== null && interval.durationSec >= minDurationSec) {
        intervals.push(interval)
      }

      currentSegments = []
    }

    for (const segment of this.pointSpeedSamples()) {
      const previousSegment = currentSegments[currentSegments.length - 1] ?? null
      const continuesCurrentInterval =
        previousSegment === null || previousSegment.toIndex === segment.fromIndex

      if (matchesSpeedOptions(segment, options) && continuesCurrentInterval) {
        currentSegments.push(segment)
        continue
      }

      flushCurrentInterval()

      if (matchesSpeedOptions(segment, options)) {
        currentSegments.push(segment)
      }
    }

    flushCurrentInterval()

    return intervals
  }
}
