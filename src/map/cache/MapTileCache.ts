export interface MapTileCache {
  get(url: string): Response | undefined
  set(url: string, response: Response): void
  has(url: string): boolean
  clear(): void
}
