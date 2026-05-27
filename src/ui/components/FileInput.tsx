import { useState, type ChangeEvent } from 'react'
import { readGpxFile, type GpxReadResult } from '../../formats/gpx/GpxFormat'
import FileInfo from './FileInfo'
import SpeedIntervalsInfo from './SpeedIntervalsInfo'
import TrackInfo from './TrackInfo'
import TrackStatisticsInfo from './TrackStatisticsInfo'

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
  const speedIntervals = track?.speedSegments() ?? []
  const points = track?.getPoints() ?? []

  return (
    <section className="file-panel" aria-label="File selection">
      <label className="file-picker">
        <span>Select GPX or XML file</span>
        <input type="file" accept=".gpx,.xml" onChange={handleFileChange} />
      </label>

      {selectedFile && <FileInfo file={selectedFile} />}

      {isReading && <p className="status-message">Reading GPX file...</p>}

      {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

      {gpxResult !== null && (
        <>
          <TrackInfo
            firstPoint={firstPoint}
            lastPoint={lastPoint}
            pointsCount={track?.pointsCount() ?? 0}
          />
          <TrackStatisticsInfo statistics={statistics} />
          <SpeedIntervalsInfo intervals={speedIntervals} points={points} />
        </>
      )}
    </section>
  )
}
