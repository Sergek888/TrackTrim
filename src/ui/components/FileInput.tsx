import { useMemo, useState, type ChangeEvent } from 'react'
import type { GpxReadResult } from '../../formats/gpx/GpxFormat'
import { localFileSource } from '../../application/sources/LocalFileSource'
import TimeSlider from './TimeSlider'
import TrackMap, { type TrackMapPoint } from './TrackMap'

export default function FileInput() {
  const [gpxResult, setGpxResult] = useState<GpxReadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReading, setIsReading] = useState<boolean>(false)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [trimEndDurationSec, setTrimEndDurationSec] = useState<number>(0)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null

    setGpxResult(null)
    setErrorMessage(null)
    setSelectedPointIndex(null)
    setTrimEndDurationSec(0)

    if (file === null) {
      return
    }

    setIsReading(true)

    try {
      const result = await localFileSource.readGpxFile(file)

      setGpxResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File could not be read or parsed.'

      setErrorMessage(message)
    } finally {
      setIsReading(false)
    }
  }

  async function handleSaveClick(): Promise<void> {
    if (previewTrack === null || gpxResult === null) {
      return
    }

    try {
      await localFileSource.saveTrack(previewTrack, 'gpx')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trimmed GPX could not be saved.'

      setErrorMessage(message)
    }
  }

  const track = gpxResult?.track ?? null
  const durationSec = track?.durationSec() ?? null
  const previewTrack = useMemo(
    () =>
      track === null
        ? null
        : selectedPointIndex === null
          ? track
          : track.segmentUntilIndex(selectedPointIndex),
    [track, selectedPointIndex],
  )
  const removedTrack = useMemo(
    () =>
      track === null || selectedPointIndex === null
        ? null
        : track.segmentFromIndex(selectedPointIndex),
    [track, selectedPointIndex],
  )
  const selectedPoint = useMemo<TrackMapPoint | null>(() => {
    if (track === null || selectedPointIndex === null) {
      return null
    }

    const point = track.point(selectedPointIndex)

    return point === null ? null : { latitude: point.lat, longitude: point.lon }
  }, [track, selectedPointIndex])

  function handleTrackClick(point: TrackMapPoint): void {
    if (track === null || durationSec === null) {
      return
    }

    const closestPointIndex = track.closestPointIndex(point.latitude, point.longitude)

    if (closestPointIndex >= 0) {
      const selectedPoint = track.point(closestPointIndex)

      setSelectedPointIndex(closestPointIndex)

      if (selectedPoint?.elapsedSec !== null && selectedPoint?.elapsedSec !== undefined) {
        setTrimEndDurationSec(Math.max(0, durationSec - selectedPoint.elapsedSec))
      }
    }
  }

  function handleTrimEndDurationChange(nextTrimEndDurationSec: number): void {
    setTrimEndDurationSec(nextTrimEndDurationSec)

    if (track === null || durationSec === null) {
      return
    }

    if (nextTrimEndDurationSec <= 0) {
      setSelectedPointIndex(null)
      return
    }

    const closestPointIndex = track.closestPointIndexByElapsedSec(
      Math.max(0, durationSec - nextTrimEndDurationSec),
    )

    if (closestPointIndex >= 0) {
      setSelectedPointIndex(closestPointIndex)
    }
  }

  return (
    <section className="file-panel" aria-label="File selection">
      <div className="track-actions">
        <div className="app-brand">
          <h1>TrackTrim</h1>
          <p>GPS track trimming</p>
        </div>

        <div className="track-action-buttons">
          <label className="file-picker">
            <span>{gpxResult === null ? 'Open GPX' : 'Replace GPX'}</span>
            <input type="file" accept=".gpx,.xml" onChange={handleFileChange} />
          </label>

          {gpxResult !== null && (
            <button className="save-button" type="button" onClick={handleSaveClick}>
              Save trimmed GPX
            </button>
          )}
        </div>
      </div>

      {isReading && <p className="status-message">Reading GPX file...</p>}

      {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

      {gpxResult === null ? (
        <section className="empty-state" aria-label="No track loaded">
          <h2>Load a GPX track</h2>
          <p>Preview the route, trim the end, then export a new GPX file.</p>
        </section>
      ) : (
        <>
          {previewTrack !== null && track !== null && (
            <TrackMap
              track={previewTrack}
              removedTrack={removedTrack}
              boundsTrack={track}
              selectedPoint={selectedPoint}
              onTrackClick={handleTrackClick}
            />
          )}

          {durationSec !== null && (
            <TimeSlider
              durationSec={durationSec}
              trimEndDurationSec={trimEndDurationSec}
              onChange={handleTrimEndDurationChange}
            />
          )}
        </>
      )}
    </section>
  )
}
