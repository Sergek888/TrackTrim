export type LocalFilePathKind = 'file' | 'directory'

export type LocalFileEntry = {
  readonly path: string
  readonly name: string
  readonly lastModified: Date | null
  readText(): Promise<string>
}

export interface LocalFileSystem {
  read(path: string, pathKind: LocalFilePathKind): Promise<readonly LocalFileEntry[]>
}

let localFileSystem: LocalFileSystem | null = null

export function configureLocalFileSystem(fileSystem: LocalFileSystem): void {
  localFileSystem = fileSystem
}

export function getLocalFileSystem(): LocalFileSystem {
  if (localFileSystem === null) {
    throw new Error('Local file system is not configured.')
  }

  return localFileSystem
}
