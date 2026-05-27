import { useMemo, useState, type ChangeEvent } from 'react'
import {
  readGpxFile,
  writeTrimmedGpxFromSource,
  type GpxReadResult,
} from '../../formats/gpx/GpxFormat'
import TimeSlider from './TimeSlider'
import TrackMap from './TrackMap'

export default function FileInput() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [gpxResult, setGpxResult] = useState<GpxReadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isReading, setIsReading] = useState<boolean>(false)
  const [trimEndDurationSec, setTrimEndDurationSec] = useState<number>(0)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null

    setSelectedFile(file)
    setGpxResult(null)
    setErrorMessage(null)
    setTrimEndDurationSec(0)

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

  function trimmedFileName(fileName: string | null): string {
    if (fileName === null) {
      return 'tracktrim-trimmed.gpx'
    }

    return fileName.replace(/\.(gpx|xml)$/i, '') + '-trimmed.gpx'
  }

  function handleSaveClick(): void {
    if (previewTrack === null || gpxResult === null) {
      return
    }

    try {
      const gpxText = writeTrimmedGpxFromSource(gpxResult.sourceText, previewTrack.pointsCount())
      const blob = new Blob([gpxText], { type: 'application/gpx+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = trimmedFileName(selectedFile?.name ?? null)
      link.click()

      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trimmed GPX could not be saved.'

      setErrorMessage(message)
    }
  }

  const track = gpxResult?.track ?? null
  const durationSec = track?.durationSec() ?? null
  const previewTrack = useMemo(
    () => track?.segmentUntilTimeFromStart(trimEndDurationSec) ?? null,
    [track, trimEndDurationSec],
  )

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
            <TrackMap track={previewTrack} boundsTrack={track} />
          )}

          {durationSec !== null && (
            <TimeSlider
              durationSec={durationSec}
              trimEndDurationSec={trimEndDurationSec}
              onChange={setTrimEndDurationSec}
            />
          )}
        </>
      )}
    </section>
  )
}
