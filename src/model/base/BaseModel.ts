export type ModelConstructor<T extends BaseModel = BaseModel> = {
  new (): T
  modelType: string
}

type SerializedFields = Record<string, unknown>
type SerializeContext = {
  seen: Map<object, number>
  nextId: number
}
type DeserializeContext = {
  values: Map<number, unknown>
}

const modelRegistry = new Map<string, ModelConstructor>()

export abstract class BaseModel {
  public static modelType: string

  public serialize(): Record<string, unknown> {
    const fields: Record<string, unknown> = {}
    const runtime = new Set(this.runtimeFields())

    for (const [key, value] of Object.entries(this)) {
      if (runtime.has(key)) {
        continue
      }

      fields[key] = value
    }

    return fields
  }

  public deserializeFields(fields: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(fields)) {
      ;(this as Record<string, unknown>)[key] = value
    }
  }

  protected runtimeFields(): readonly string[] {
    return []
  }

  public exportState(): Record<string, unknown> {
    return this.serialize()
  }

  protected importState(state: Record<string, unknown>): void {
    this.deserializeFields(state)
  }

  public toModelState(): Record<string, unknown> {
    return this.serialize()
  }

  public fromModelState(state: Record<string, unknown>): void {
    this.deserializeFields(state)
  }

  public afterDeserialize(): void {}

  public modelKey(): string | null {
    return null
  }
}

export function registerModel(modelClass: ModelConstructor): void {
  const modelType = modelClass.modelType

  if (modelType === undefined || modelType.trim() === '') {
    throw new Error('Model class must define modelType.')
  }

  const registered = modelRegistry.get(modelType)

  if (registered !== undefined && registered !== modelClass) {
    throw new Error(`Model type is already registered: ${modelType}.`)
  }

  modelRegistry.set(modelType, modelClass)
}

export function modelConstructor(modelType: string): ModelConstructor | null {
  return modelRegistry.get(modelType) ?? null
}

export function serialize(value: unknown): unknown {
  return serializeValue(value, {
    seen: new Map(),
    nextId: 1,
  })
}

export function deserialize<T = unknown>(value: unknown): T {
  return deserializeValue(value, { values: new Map() }) as T
}

function serializeValue(value: unknown, context: SerializeContext): unknown {
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
    throw new Error(`Unsupported serialized value: ${typeof value}.`)
  }

  const ref = context.seen.get(value)

  if (ref !== undefined) {
    return { __ref: ref }
  }

  const id = context.nextId
  context.nextId += 1
  context.seen.set(value, id)

  if (Array.isArray(value)) {
    return {
      __kind: 'array',
      __id: id,
      items: value.map((item) => serializeValue(item, context)),
    }
  }

  if (value instanceof BaseModel) {
    const constructor = value.constructor as typeof BaseModel
    const modelType = constructor.modelType

    if (modelType === undefined || modelType.trim() === '') {
      throw new Error('Model instance constructor must define modelType.')
    }

    return {
      __id: id,
      __type: modelType,
      fields: serializeFields(value.serialize(), context),
    }
  }

  return {
    __kind: 'object',
    __id: id,
    fields: serializeFields(value as Record<string, unknown>, context),
  }
}

function serializeFields(fields: Record<string, unknown>, context: SerializeContext): SerializedFields {
  const serialized: SerializedFields = {}

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue
    }

    serialized[key] = serializeValue(value, context)
  }

  return serialized
}

function deserializeValue(value: unknown, context: DeserializeContext): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeValue(item, context))
  }

  if (!isRecord(value)) {
    throw new Error(`Unsupported serialized value: ${typeof value}.`)
  }

  if (typeof value.__ref === 'number') {
    if (!context.values.has(value.__ref)) {
      throw new Error(`Serialized reference ${value.__ref} was not found.`)
    }

    return context.values.get(value.__ref)
  }

  if (value.__kind === 'date') {
    if (typeof value.value !== 'string') {
      throw new Error('Serialized date must contain string value.')
    }

    return new Date(value.value)
  }

  if (value.__kind === 'array') {
    if (!Array.isArray(value.items)) {
      throw new Error('Serialized array must contain items.')
    }

    const items: unknown[] = []
    registerDeserializedValue(value, items, context)
    items.push(...value.items.map((item) => deserializeValue(item, context)))

    return items
  }

  if (typeof value.__type === 'string') {
    const Constructor = modelRegistry.get(value.__type)

    if (Constructor === undefined) {
      throw new Error(`Unknown model type: ${value.__type}`)
    }

    const model = new Constructor()
    registerDeserializedValue(value, model, context)
    model.deserializeFields(deserializeFields(readSerializedFields(value), context))
    model.afterDeserialize()

    return model
  }

  if (value.__kind === 'object') {
    const object: Record<string, unknown> = {}
    registerDeserializedValue(value, object, context)
    Object.assign(object, deserializeFields(readSerializedFields(value), context))

    return object
  }

  return deserializeFields(value, context)
}

function deserializeFields(fields: Record<string, unknown>, context: DeserializeContext): Record<string, unknown> {
  const restored: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    restored[key] = deserializeValue(value, context)
  }

  return restored
}

function registerDeserializedValue(
  serialized: Record<string, unknown>,
  value: unknown,
  context: DeserializeContext,
): void {
  if (typeof serialized.__id === 'number') {
    context.values.set(serialized.__id, value)
  }
}

function readSerializedFields(value: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(value.fields)) {
    throw new Error('Serialized model or object must contain fields.')
  }

  return value.fields
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
