export async function readTextFile(file: File): Promise<string> {
  try {
    return await file.text()
  } catch {
    throw new Error(`${file.name} could not be read.`)
  }
}
