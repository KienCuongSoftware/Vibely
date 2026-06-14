import { apiClient } from '../api/client.js'
import { isCookieSession } from '../auth/session.js'

export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED')
    this.name = 'SessionExpiredError'
    this.status = 401
  }
}

/**
 * Cookie session: refresh access cookie via ws-ticket, then connect with cookies only.
 */
export async function resolveRealtimeWsToken(sessionToken) {
  if (!sessionToken) return null
  if (!isCookieSession(sessionToken)) return sessionToken

  try {
    const ticket = await apiClient.wsTicket()
    if (!ticket?.token) {
      throw new SessionExpiredError()
    }
    return sessionToken
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      throw err
    }
    if (err?.status === 400 || err?.status === 401) {
      throw new SessionExpiredError()
    }
    return sessionToken
  }
}

export function usesCookieWebSocketAuth(sessionToken) {
  return isCookieSession(sessionToken)
}
