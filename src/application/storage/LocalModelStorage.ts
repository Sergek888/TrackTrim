import { deserialize, serialize } from '../../model/base/BaseModel'

export class LocalModelStorage {
  public constructor(private readonly storageKey: string) {}

  public save(value: unknown): boolean {
    try {
      const serialized = serialize(value)

      localStorage.setItem(this.storageKey, JSON.stringify(serialized))

      return true
    } catch (error) {
      localStorage.removeItem(this.storageKey)
      console.warn('Model state could not be saved.', error)

      return false
    }
  }

  public load<T>(): T | null {
    const raw = localStorage.getItem(this.storageKey)

    if (raw === null) {
      return null
    }

    try {
      return deserialize<T>(JSON.parse(raw))
    } catch (error) {
      localStorage.removeItem(this.storageKey)
      console.warn('Stored model state could not be restored.', error)

      return null
    }
  }

  public clear(): void {
    localStorage.removeItem(this.storageKey)
  }
}
