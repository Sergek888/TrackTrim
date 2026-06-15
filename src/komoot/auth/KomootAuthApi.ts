import type { KomootAuthSession, KomootUser } from '../shared/KomootTypes.js'

export interface KomootAuthApi {
  loginWithPassword(email: string, password: string): Promise<KomootAuthSession>
  checkSession(session: KomootAuthSession): Promise<boolean>
  getCurrentUser(session: KomootAuthSession): Promise<KomootUser>
}
