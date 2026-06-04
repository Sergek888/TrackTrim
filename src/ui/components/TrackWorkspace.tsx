import { useMemo, useState } from 'react'
import { localFileSource } from '../../application/sources/LocalFileSource'
import type { Track } from '../../model/Track'
import type { TrackOrigin } from '../../model/TrackOrigin'
import FileInput from './FileInput'
import KomootImport from './KomootImport'
import TimeSlider from './TimeSlider'
import TrackMap, { type TrackMapPoint } from './TrackMap'

export default function TrackWorkspace() {
  const [track, setTrack] = useState<Track | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReading, setIsReading] = useState<boolean>(false)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [trimEndDurationSec, setTrimEndDurationSec] = useState<number>(0)

  function resetTrackState(): void {
    setTrack(null)
    setErrorMessage(null)
    setSelectedPointIndex(null)
    setTrimEndDurationSec(0)
  }

  async function loadOrigin(origin: TrackOrigin, fallbackErrorMessage: string): Promise<void> {
    resetTrackState()
    setIsReading(true)

    try {
      const result = await origin.source.loadTrack(origin)

      setTrack(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : fallbackErrorMessage

      setErrorMessage(message)
    } finally {
      setIsReading(false)
    }
  }

  async function handleFileSelected(file: File | null): Promise<void> {
    resetTrackState()

    if (file === null) {
      return
    }

    try {
      const origin = await localFileSource.createOriginFromFile(file)

      await loadOrigin(origin, 'File could not be read or parsed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File could not be read or parsed.'

      setErrorMessage(message)
    }
  }

  async function handleSaveClick(): Promise<void> {
    if (previewTrack === null || track === null) {
      return
    }

    const origin = previewTrack.origin

    if (origin === null) {
      setErrorMessage('Track origin is missing.')
      return
    }

    try {
      await origin.source.saveTrack(previewTrack, 'gpx')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trimmed GPX could not be saved.'

      setErrorMessage(message)
    }
  }

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
          <KomootImport
            onOriginSelected={(origin) => {
              void loadOrigin(origin, 'Track could not be loaded.')
            }}
          />
          <FileInput hasTrack={track !== null} onFileSelected={handleFileSelected} />

          {track !== null && (
            <button className="save-button" type="button" onClick={handleSaveClick}>
              Save trimmed GPX
            </button>
          )}
        </div>
      </div>

      {isReading && <p className="status-message">Loading track...</p>}

      {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

      {track === null ? (
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
