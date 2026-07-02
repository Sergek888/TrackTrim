export type ModelConstructor<T extends BaseModel = BaseModel> = {
  new (...args: never[]): T
  modelType: string
}

export abstract class BaseModel {
  public static modelType: string

  protected exportState(): Record<string, unknown> {
    return Object.fromEntries(Object.entries(this))
  }

  protected importState(state: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(state)) {
      ;(this as Record<string, unknown>)[key] = value
    }
  }

  public toModelState(): Record<string, unknown> {
    return this.exportState()
  }

  public fromModelState(state: Record<string, unknown>): void {
    this.importState(state)
  }

  public afterDeserialize(): void {}
}
