import type { ChangeEvent } from 'react'

type FileInputProps = {
  readonly hasTrack: boolean
  readonly onFileSelected: (file: File | null) => void
}

export default function FileInput({ hasTrack, onFileSelected }: FileInputProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null

    onFileSelected(file)
  }

  return (
    <label className="file-picker">
      <span>{hasTrack ? 'Replace GPX' : 'Open GPX'}</span>
      <input type="file" accept=".gpx,.xml" onChange={handleFileChange} />
    </label>
  )
}
