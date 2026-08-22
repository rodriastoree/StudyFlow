import type { AuthenticationResponse } from '../../types/api/auth'

const storageKey = 'studyflow.auth'

export type AuthSession = {
  token: string
  expiresAt: string
  email: string
  userId: string | null
}

type JwtPayload = {
  sub?: unknown
  email?: unknown
  exp?: unknown
}

function readJwtPayload(token: string): JwtPayload | null {
  try {
    const encodedPayload = token.split('.')[1]
    if (!encodedPayload) return null

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(paddedBase64)) as JwtPayload
  } catch {
    return null
  }
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false

  const session = value as Partial<AuthSession>
  return typeof session.token === 'string'
    && session.token.length > 0
    && typeof session.expiresAt === 'string'
    && Number.isFinite(Date.parse(session.expiresAt))
    && Date.parse(session.expiresAt) > Date.now()
    && typeof session.email === 'string'
    && (typeof session.userId === 'string' || session.userId === null)
}

export function persistAuthSession(response: AuthenticationResponse, fallbackEmail: string) {
  if (!response.token) throw new Error('La API no devolvió un token de acceso.')

  const payload = readJwtPayload(response.token)
  const expirationFromToken = typeof payload?.exp === 'number'
    ? new Date(payload.exp * 1000).toISOString()
    : null
  const session: AuthSession = {
    token: response.token,
    expiresAt: response.expiresAt ?? expirationFromToken ?? '',
    email: typeof payload?.email === 'string' ? payload.email : fallbackEmail,
    userId: typeof payload?.sub === 'string' ? payload.sub : null,
  }

  if (!isValidSession(session)) {
    throw new Error('El token recibido no tiene una expiración válida.')
  }

  localStorage.setItem(storageKey, JSON.stringify(session))
  return session
}

export function restoreAuthSession(): AuthSession | null {
  try {
    const storedValue = localStorage.getItem(storageKey)
    if (!storedValue) return null

    const session = JSON.parse(storedValue) as unknown
    if (isValidSession(session)) return session
  } catch {
    // A malformed or inaccessible local value is treated as a signed-out session.
  }

  clearAuthSession()
  return null
}

export function clearAuthSession() {
  localStorage.removeItem(storageKey)
}
