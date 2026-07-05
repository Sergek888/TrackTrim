import { BaseModel, modelConstructor } from './BaseModel'

export type StoredModelRecord = {
  readonly id: string
  readonly type: string
  readonly fields: StoredModelValue
  readonly updatedAt: string
}

export type StoredModelRoot = {
  readonly value: StoredModelValue
  readonly updatedAt: string
}

export type StoredModelValue =
  | null
  | string
  | number
  | boolean
  | { readonly __kind: 'date'; readonly value: string }
  | { readonly __kind: 'array'; readonly items: readonly StoredModelValue[] }
  | { readonly __kind: 'object'; readonly fields: Record<string, StoredModelValue> }
  | { readonly __modelRef: string }

type SerializeRecordsContext = {
  readonly records: Map<string, StoredModelRecord>
  readonly seen: Map<object, string>
  readonly updatedAt: string
}

type DeserializeRecordsContext = {
  readonly records: Map<string, StoredModelRecord>
  readonly models: Map<string, BaseModel>
  readonly pendingAfterDeserialize: BaseModel[]
}

export type SerializedModelRecords = {
  readonly root: StoredModelRoot
  readonly records: readonly StoredModelRecord[]
}

export function serializeModelRecords(value: unknown): SerializedModelRecords {
  const context: SerializeRecordsContext = {
    records: new Map<string, StoredModelRecord>(),
    seen: new Map<object, string>(),
    updatedAt: new Date().toISOString(),
  }
  const rootValue = serializeStoredValue(value, context, 'root')

  return {
    root: {
      value: rootValue,
      updatedAt: context.updatedAt,
    },
    records: [...context.records.values()],
  }
}

export function deserializeModelRecords<T>(
  root: StoredModelRoot,
  records: readonly StoredModelRecord[],
): T {
  const context: DeserializeRecordsContext = {
    records: new Map(records.map((record) => [record.id, record])),
    models: new Map<string, BaseModel>(),
    pendingAfterDeserialize: [],
  }
  const value = deserializeStoredValue(root.value, context) as T

  for (const model of context.pendingAfterDeserialize) {
    model.afterDeserialize()
  }

  return value
}

function serializeStoredValue(
  value: unknown,
  context: SerializeRecordsContext,
  path: string,
): StoredModelValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value === undefined) {
    return null
  }

  if (value instanceof Date) {
    return {
      __kind: 'date',
      value: value.toISOString(),
    }
  }

  if (typeof value !== 'object') {
    throw new Error(`Unsupported stored model value: ${typeof value}.`)
  }

  if (value instanceof BaseModel) {
    return serializeModelReference(value, context, path)
  }

  if (Array.isArray(value)) {
    return {
      __kind: 'array',
      items: value.map((item, index) => serializeStoredValue(item, context, `${path}.${index}`)),
    }
  }

  return {
    __kind: 'object',
    fields: serializePlainFields(value as Record<string, unknown>, context, path),
  }
}

function serializeModelReference(
  model: BaseModel,
  context: SerializeRecordsContext,
  path: string,
): StoredModelValue {
  const seen = context.seen.get(model)

  if (seen !== undefined) {
    return { __modelRef: seen }
  }

  const constructor = model.constructor as typeof BaseModel
  const modelType = constructor.modelType

  if (modelType === undefined || modelType.trim() === '') {
    throw new Error('Model instance constructor must define modelType.')
  }

  const id = model.modelKey() === null
    ? `${modelType}:$${path}`
    : `${modelType}:${model.modelKey()}`

  context.seen.set(model, id)
  context.records.set(id, {
    id,
    type: modelType,
    fields: {
      __kind: 'object',
      fields: serializePlainFields(model.serialize(), context, id),
    },
    updatedAt: context.updatedAt,
  })

  return { __modelRef: id }
}

function serializePlainFields(
  fields: Record<string, unknown>,
  context: SerializeRecordsContext,
  path: string,
): Record<string, StoredModelValue> {
  const serialized: Record<string, StoredModelValue> = {}

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      serialized[key] = serializeStoredValue(value, context, `${path}.${key}`)
    }
  }

  return serialized
}

function deserializeStoredValue(
  value: StoredModelValue,
  context: DeserializeRecordsContext,
): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if ('__modelRef' in value) {
    return deserializeModelReference(value.__modelRef, context)
  }

  if (value.__kind === 'date') {
    return new Date(value.value)
  }

  if (value.__kind === 'array') {
    return value.items.map((item) => deserializeStoredValue(item, context))
  }

  return deserializePlainFields(value.fields, context)
}

function deserializeModelReference(
  id: string,
  context: DeserializeRecordsContext,
): BaseModel {
  const cached = context.models.get(id)

  if (cached !== undefined) {
    return cached
  }

  const record = context.records.get(id)

  if (record === undefined) {
    throw new Error(`Stored model record was not found: ${id}.`)
  }

  const Constructor = modelConstructor(record.type)

  if (Constructor === null) {
    throw new Error(`Unknown model type: ${record.type}`)
  }

  const model = new Constructor()
  context.models.set(id, model)
  model.deserializeFields(deserializeStoredValue(record.fields, context) as Record<string, unknown>)
  context.pendingAfterDeserialize.push(model)

  return model
}

function deserializePlainFields(
  fields: Record<string, StoredModelValue>,
  context: DeserializeRecordsContext,
): Record<string, unknown> {
  const restored: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    restored[key] = deserializeStoredValue(value, context)
  }

  return restored
}
