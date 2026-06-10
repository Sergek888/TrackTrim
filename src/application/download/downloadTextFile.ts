export function downloadTextFile(text: string, fileName: string, type: string): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
