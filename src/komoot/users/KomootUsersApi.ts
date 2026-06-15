import type { KomootUser } from '../shared/KomootTypes.js'
import { isRecord, stringValue } from '../shared/KomootUtils.js'
import type { KomootHttpClient } from '../transport/KomootHttpClient.js'

export interface KomootUsersApi {
  getUser(userId: string): Promise<KomootUser>
  getCurrentUser(): Promise<KomootUser>
  getDisplayName(userId: string): Promise<string | null>
}

export class DefaultKomootUsersApi implements KomootUsersApi {
  public constructor(
    private readonly http: KomootHttpClient,
    private readonly currentUserId: string | null,
  ) {}

  public async getUser(userId: string): Promise<KomootUser> {
    const raw = await this.http.getJson(`/users/${userId}/`)
    return { id: userId, displayName: userDisplayName(raw), raw }
  }

  public getCurrentUser(): Promise<KomootUser> {
    if (this.currentUserId === null) {
      throw new Error('Komoot session is required.')
    }
    return this.getUser(this.currentUserId)
  }

  public async getDisplayName(userId: string): Promise<string | null> {
    return (await this.getUser(userId)).displayName
  }
}

function userDisplayName(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  return stringValue(
    value.display_name ?? value.displayname ?? value.displayName ?? value.name ?? value.username,
  )
}
