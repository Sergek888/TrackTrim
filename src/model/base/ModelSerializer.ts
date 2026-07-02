import { BaseModel, type ModelConstructor } from './BaseModel'

export type ModelState =
  | { readonly __kind: 'primitive'; readonly value: null | string | number | boolean }
  | { readonly __kind: 'date'; readonly value: string }
  | { readonly __kind: 'array'; readonly __id: number; readonly items: readonly ModelState[] }
  | { readonly __kind: 'object'; readonly __id: number; readonly fields: Record<string, ModelState> }
  | {
      readonly __kind: 'model'
      readonly __id: number
      readonly __type: string
      readonly fields: Record<string, ModelState>
    }
  | { readonly __kind: 'ref'; readonly __ref: number }

type DeserializeContext = {
  readonly objects: Map<number, unknown>
  readonly models: BaseModel[]
}

export class ModelSerializer {
  private static readonly constructors = new Map<string, ModelConstructor>()

  public static register(ModelClass: ModelConstructor): void {
    if (ModelClass.modelType === undefined || ModelClass.modelType.trim() === '') {
      throw new Error('Model class must define modelType.')
    }

    this.constructors.set(ModelClass.modelType, ModelClass)
  }

  public static serialize(value: unknown): ModelState {
    return this.serializeValue(value, new Map(), { nextId: 1 })
  }

  public static deserialize<T>(state: ModelState): T {
    const context: DeserializeContext = {
      objects: new Map(),
      models: [],
    }
    const value = this.deserializeValue(state, context) as T

    for (const model of context.models) {
      model.afterDeserialize()
    }

    return value
  }

  private static serializeValue(
    value: unknown,
    seen: Map<object, number>,
    idState: { nextId: number },
  ): ModelState {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return { __kind: 'primitive', value }
    }

    if (value === undefined) {
      return { __kind: 'primitive', value: null }
    }

    if (value instanceof Date) {
      return { __kind: 'date', value: value.toISOString() }
    }

    if (typeof value !== 'object') {
      throw new Error(`Unsupported model state value: ${typeof value}.`)
    }

    const ref = seen.get(value)

    if (ref !== undefined) {
      return { __kind: 'ref', __ref: ref }
    }

    const id = idState.nextId
    idState.nextId += 1
    seen.set(value, id)

    if (Array.isArray(value)) {
      return {
        __kind: 'array',
        __id: id,
        items: value.map((item) => this.serializeValue(item, seen, idState)),
      }
    }

    if (value instanceof BaseModel) {
      const constructor = value.constructor as typeof BaseModel
      const modelType = constructor.modelType

      if (modelType === undefined || modelType.trim() === '') {
        throw new Error('Model instance constructor must define modelType.')
      }

      return {
        __kind: 'model',
        __id: id,
        __type: modelType,
        fields: this.serializeFields(value.toModelState(), seen, idState),
      }
    }

    return {
      __kind: 'object',
      __id: id,
      fields: this.serializeFields(value as Record<string, unknown>, seen, idState),
    }
  }

  private static serializeFields(
    fields: Record<string, unknown>,
    seen: Map<object, number>,
    idState: { nextId: number },
  ): Record<string, ModelState> {
    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, this.serializeValue(value, seen, idState)]),
    )
  }

  private static deserializeValue(state: ModelState, context: DeserializeContext): unknown {
    switch (state.__kind) {
      case 'primitive':
        return state.value
      case 'date':
        return new Date(state.value)
      case 'ref': {
        if (!context.objects.has(state.__ref)) {
          throw new Error(`ModelState reference ${state.__ref} was not found.`)
        }

        return context.objects.get(state.__ref)
      }
      case 'array': {
        const items: unknown[] = []

        context.objects.set(state.__id, items)
        items.push(...state.items.map((item) => this.deserializeValue(item, context)))

        return items
      }
      case 'object': {
        const object: Record<string, unknown> = {}

        context.objects.set(state.__id, object)
        for (const [key, value] of Object.entries(state.fields)) {
          object[key] = this.deserializeValue(value, context)
        }

        return object
      }
      case 'model': {
        const Constructor = this.constructors.get(state.__type)

        if (Constructor === undefined) {
          throw new Error(`Model type is not registered: ${state.__type}.`)
        }

        const model = Object.create(Constructor.prototype) as BaseModel

        context.objects.set(state.__id, model)
        context.models.push(model)
        model.fromModelState(this.deserializeFields(state.fields, context))

        return model
      }
    }
  }

  private static deserializeFields(
    fields: Record<string, ModelState>,
    context: DeserializeContext,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, this.deserializeValue(value, context)]),
    )
  }
}
