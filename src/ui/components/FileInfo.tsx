import { formatFileSize, formatModifiedDate } from '../formatters'

type FileInfoProps = {
  file: File
}

export default function FileInfo({ file }: FileInfoProps) {
  return (
    <section className="file-info" aria-label="Selected file information">
      <h2>Selected file</h2>

      <dl>
        <dt>Name:</dt>
        <dd>{file.name}</dd>

        <dt>Size:</dt>
        <dd>{formatFileSize(file.size)}</dd>

        <dt>Type:</dt>
        <dd>{file.type || 'unknown'}</dd>

        <dt>Modified:</dt>
        <dd>{formatModifiedDate(file.lastModified)}</dd>
      </dl>
    </section>
  )
}
