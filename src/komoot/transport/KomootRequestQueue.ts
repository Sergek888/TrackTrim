type KomootQueuedTask<T> = {
  readonly run: () => Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

export class KomootRequestQueue {
  private readonly pending: KomootQueuedTask<unknown>[] = []
  private activeCount = 0

  public constructor(private readonly maxParallelRequests = 3) {}

  public enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      this.pump()
    })
  }

  private pump(): void {
    while (this.activeCount < this.maxParallelRequests) {
      const task = this.pending.shift()

      if (task === undefined) {
        return
      }

      this.activeCount += 1

      void task.run()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1)
          this.pump()
        })
    }
  }
}
