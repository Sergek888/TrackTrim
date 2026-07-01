import type { LocalFileEntry, LocalFilePathKind, LocalFileSystem } from './localFileSystem'

export type BrowserLocalFileSource = {
  readonly path: string
  readonly pathKind: LocalFilePathKind
}

class BrowserFileEntry implements LocalFileEntry {
  public constructor(
    public readonly path: string,
    private readonly file: File,
  ) {}

  public get name(): string {
    return this.file.name
  }

  public get lastModified(): Date {
    return new Date(this.file.lastModified)
  }

  public async readText(): Promise<string> {
    try {
      return await this.file.text()
    } catch {
      throw new Error(`${this.file.name} could not be read.`)
    }
  }
}

class BrowserLocalFileSystem implements LocalFileSystem {
  private readonly entriesByPath = new Map<string, readonly BrowserFileEntry[]>()

  public register(files: readonly File[]): BrowserLocalFileSource {
    if (files.length === 0) {
      throw new Error('Select at least one GPX file.')
    }

    const pathKind: LocalFilePathKind = files.length === 1 ? 'file' : 'directory'
    const path = this.createPath(pathKind)
    const entries = files.map((file, index) => new BrowserFileEntry(this.childPath(path, file.name, index), file))

    this.entriesByPath.set(path, entries)

    return { path, pathKind }
  }

  public async read(path: string, pathKind: LocalFilePathKind): Promise<readonly LocalFileEntry[]> {
    const entries = this.entriesByPath.get(path) ?? null

    if (entries === null) {
      throw new Error(`${pathKind === 'file' ? 'File' : 'Directory'} ${path} could not be read.`)
    }

    return entries
  }

  private createPath(pathKind: LocalFilePathKind): string {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    return `browser-${pathKind}://${id}`
  }

  private childPath(path: string, fileName: string, index: number): string {
    return `${path}/${index}-${encodeURIComponent(fileName)}`
  }
}

export const browserLocalFileSystem = new BrowserLocalFileSystem()
