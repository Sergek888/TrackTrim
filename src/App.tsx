import FileInput from './ui/components/FileInput'

export default function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>TrackTrim</h1>
        <p>GPS track analysis and smart trimming</p>
      </header>

      <FileInput />
    </main>
  )
}
