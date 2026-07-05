import {
  deserializeModelRecords,
  serializeModelRecords,
  type StoredModelRecord,
  type StoredModelRoot,
} from '../../model/base/ModelRecordSerializer'

const DEFAULT_DB_NAME = 'trackviewer-model-store'
const DEFAULT_DB_VERSION = 1
const MODEL_STORE = 'models'
const ROOT_STORE = 'roots'

export class IndexedDbModelStore {
  private databasePromise: Promise<IDBDatabase> | null = null

  public constructor(
    private readonly databaseName = DEFAULT_DB_NAME,
    private readonly indexedDb: IDBFactory | null = globalThis.indexedDB ?? null,
  ) {}

  public async saveRoot(rootKey: string, value: unknown): Promise<boolean> {
    if (this.indexedDb === null) {
      return false
    }

    try {
      await yieldToMainThread()
      const serialized = serializeModelRecords(value)
      await yieldToMainThread()
      const database = await this.database()
      const readTransaction = database.transaction([MODEL_STORE, ROOT_STORE], 'readonly')
      const models = readTransaction.objectStore(MODEL_STORE)
      const roots = readTransaction.objectStore(ROOT_STORE)
      const existingRecordsRequest = requestResult<StoredModelRecord[]>(models.getAll())
      const existingRootRequest = requestResult<StoredRootRecord | undefined>(roots.get(rootKey))
      const existingRecords = await existingRecordsRequest
      const existingRoot = await existingRootRequest

      await transactionDone(readTransaction)
      await yieldToMainThread()

      const existingRecordSignatures = new Map(
        existingRecords.map((record) => [record.id, modelRecordSignature(record)]),
      )
      const changedRecords = serialized.records.filter((record) =>
        existingRecordSignatures.get(record.id) !== modelRecordSignature(record),
      )
      const rootChanged = existingRoot === undefined ||
        stableStringify(existingRoot.value) !== stableStringify(serialized.root.value)

      if (changedRecords.length === 0 && !rootChanged) {
        return true
      }

      const writeTransaction = database.transaction([MODEL_STORE, ROOT_STORE], 'readwrite')
      const writeModels = writeTransaction.objectStore(MODEL_STORE)
      const writeRoots = writeTransaction.objectStore(ROOT_STORE)

      for (const record of changedRecords) {
        writeModels.put(record)
      }

      if (rootChanged) {
        writeRoots.put({
          key: rootKey,
          ...serialized.root,
        })
      }

      await transactionDone(writeTransaction)

      return true
    } catch (error) {
      console.warn('Model root could not be saved.', error)

      return false
    }
  }

  public async loadRoot<T>(rootKey: string): Promise<T | null> {
    if (this.indexedDb === null) {
      return null
    }

    try {
      const database = await this.database()
      const rootTransaction = database.transaction(ROOT_STORE, 'readonly')
      const root = await requestResult<StoredRootRecord | undefined>(
        rootTransaction.objectStore(ROOT_STORE).get(rootKey),
      )
      await transactionDone(rootTransaction)

      if (root === undefined) {
        return null
      }

      const recordsTransaction = database.transaction(MODEL_STORE, 'readonly')
      const records = await requestResult<StoredModelRecord[]>(
        recordsTransaction.objectStore(MODEL_STORE).getAll(),
      )
      await transactionDone(recordsTransaction)
      await yieldToMainThread()

      return deserializeModelRecords<T>(
        {
          value: root.value,
          updatedAt: root.updatedAt,
        },
        records,
      )
    } catch (error) {
      console.warn('Model root could not be loaded.', error)

      return null
    }
  }

  public async clear(): Promise<void> {
    if (this.indexedDb === null) {
      return
    }

    const database = await this.database()
    const transaction = database.transaction([MODEL_STORE, ROOT_STORE], 'readwrite')

    transaction.objectStore(MODEL_STORE).clear()
    transaction.objectStore(ROOT_STORE).clear()
    await transactionDone(transaction)
  }

  private database(): Promise<IDBDatabase> {
    if (this.indexedDb === null) {
      return Promise.reject(new Error('IndexedDB is not available.'))
    }

    this.databasePromise ??= openDatabase(this.indexedDb, this.databaseName)

    return this.databasePromise
  }
}

type StoredRootRecord = StoredModelRoot & {
  readonly key: string
}

function openDatabase(indexedDb: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName, DEFAULT_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(MODEL_STORE)) {
        database.createObjectStore(MODEL_STORE, { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains(ROOT_STORE)) {
        database.createObjectStore(ROOT_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'))
  })
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function modelRecordSignature(record: StoredModelRecord): string {
  return stableStringify({
    type: record.type,
    fields: record.fields,
  })
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value))
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  )
}
