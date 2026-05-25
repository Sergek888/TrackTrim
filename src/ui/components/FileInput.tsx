import { useState, type ChangeEvent } from 'react'
import { readGpxFile, type GpxReadResult } from '../../formats/gpx/GpxFormat'
import type { TrackPoint } from '../../model/TrackPoint'
import type { TrackStatistics } from '../../model/TrackStatistics'
import {
  formatAverageSpeed,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatFileSize,
  formatModifiedDate,
  formatNullableNumber,
  formatPointDate,
} from '../formatters'

function TrackPointInfo({ point, title }: { point: TrackPoint; title: string }) {
  return (
    <section className="track-point">
      <h3>{title}</h3>

      <dl>
        <dt>Lat:</dt>
        <dd>{point.lat}</dd>

        <dt>Lon:</dt>
        <dd>{point.lon}</dd>

        <dt>Time:</dt>
        <dd>{formatPointDate(point.time)}</dd>

        <dt>Elevation:</dt>
        <dd>{formatNullableNumber(point.ele)}</dd>
      </dl>
    </section>
  )
}

function TrackStatisticsInfo({ statistics }: { statistics: TrackStatistics | null }) {
  return (
    <section className="track-statistics" aria-label="Track statistics">
      <h2>Track statistics</h2>

      {statistics === null ? (
        <p>Insufficient track data</p>
      ) : (
        <dl>
          <dt>Points:</dt>
          <dd>{statistics.pointsCount}</dd>

          <dt>Start:</dt>
          <dd>{formatDateTime(statistics.startTime)}</dd>

          <dt>Finish:</dt>
          <dd>{formatDateTime(statistics.finishTime)}</dd>

          <dt>Duration:</dt>
          <dd>{formatDuration(statistics.durationSec)}</dd>

          <dt>Distance:</dt>
          <dd>{formatDistance(statistics.distanceKm)}</dd>

          <dt>Average speed:</dt>
          <dd>{formatAverageSpeed(statistics.averageSpeedKmh)}</dd>
        </dl>
      )}
    </section>
  )
}

export default function FileInput() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [gpxResult, setGpxResult] = useState<GpxReadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReading, setIsReading] = useState<boolean>(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null

    setSelectedFile(file)
    setGpxResult(null)
    setErrorMessage(null)

    if (file === null) {
      return
    }

    setIsReading(true)

    try {
      const result = await readGpxFile(file)

      setGpxResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File could not be read or parsed.'

      setErrorMessage(message)
    } finally {
      setIsReading(false)
    }
  }

  const track = gpxResult?.track ?? null
  const firstPoint = track?.firstPoint() ?? null
  const lastPoint = track?.lastPoint() ?? null
  const statistics = track?.statistics() ?? null

  return (
    <section className="file-panel" aria-label="File selection">
      <label className="file-picker">
        <span>Select GPX or XML file</span>
        <input type="file" accept=".gpx,.xml" onChange={handleFileChange} />
      </label>

      {selectedFile && (
        <section className="file-info" aria-label="Selected file information">
          <h2>Selected file</h2>

          <dl>
            <dt>Name:</dt>
            <dd>{selectedFile.name}</dd>

            <dt>Size:</dt>
            <dd>{formatFileSize(selectedFile.size)}</dd>

            <dt>Type:</dt>
            <dd>{selectedFile.type || 'unknown'}</dd>

            <dt>Modified:</dt>
            <dd>{formatModifiedDate(selectedFile.lastModified)}</dd>
          </dl>
        </section>
      )}

      {isReading && <p className="status-message">Reading GPX file...</p>}

      {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

      {gpxResult !== null && (
        <>
          <section className="track-info" aria-label="Track information">
            <h2>Track information</h2>

            {track === null || track.pointsCount() === 0 ? (
              <p>No track points found</p>
            ) : (
              <>
                <dl>
                  <dt>Points:</dt>
                  <dd>{track.pointsCount()}</dd>
                </dl>

                {firstPoint !== null && <TrackPointInfo point={firstPoint} title="First point:" />}
                {lastPoint !== null && <TrackPointInfo point={lastPoint} title="Last point:" />}
              </>
            )}
          </section>

          <TrackStatisticsInfo statistics={statistics} />
        </>
      )}
    </section>
  )
}
