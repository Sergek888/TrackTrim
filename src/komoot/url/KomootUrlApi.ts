import type { KomootTarget } from '../shared/KomootTypes.js'
import { parseKomootTarget } from './KomootUrlParser.js'

export interface KomootUrlApi {
  parse(input: string): KomootTarget | null
  getTargetType(input: string): KomootTarget['kind'] | null
  getTourUrl(id: string): string
  getTourShareUrl(id: string): string
  getCollectionUrl(id: string): string
  getUserUrl(userId: string): string
}

export class DefaultKomootUrlApi implements KomootUrlApi {
  public parse(input: string): KomootTarget | null {
    return parseKomootTarget(input)
  }

  public getTargetType(input: string): KomootTarget['kind'] | null {
    return this.parse(input)?.kind ?? null
  }

  public getTourUrl(id: string): string {
    return `https://www.komoot.com/tour/${id}`
  }

  public getTourShareUrl(id: string): string {
    return this.getTourUrl(id)
  }

  public getCollectionUrl(id: string): string {
    return `https://www.komoot.com/collection/${id}`
  }

  public getUserUrl(userId: string): string {
    return `https://www.komoot.com/user/${userId}`
  }
}
