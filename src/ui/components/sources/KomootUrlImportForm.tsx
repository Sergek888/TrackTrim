import { useState, type FormEvent } from 'react'

type KomootUrlImportFormProps = {
  label: string
  placeholder: string
  onImport: (url: string) => void
}

export default function KomootUrlImportForm({
  label,
  placeholder,
  onImport,
}: KomootUrlImportFormProps) {
  const [url, setUrl] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (url.trim() !== '') {
      onImport(url.trim())
    }
  }

  return (
    <form className="komoot-url-import-form" onSubmit={handleSubmit}>
      <label>
        <span>{label}</span>
        <input
          type="url"
          value={url}
          placeholder={placeholder}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <button className="save-button" type="submit" disabled={url.trim() === ''}>
        Импортировать
      </button>
    </form>
  )
}
