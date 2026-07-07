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
 * Verifies the session (and that the API is reachable) before opening `/ws`.
 * Cookie sessions refresh via ws-ticket; JWT sessions validate the bearer token the same way.
 */
export async function resolveRealtimeWsToken(sessionToken) {
  if (!sessionToken) return null

  try {
    const ticket = await apiClient.wsTicket(
      isCookieSession(sessionToken) ? undefined : sessionToken,
    )
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
    // Backend unreachable — skip realtime until the provider retries.
    return null
  }
}

export function usesCookieWebSocketAuth(sessionToken) {
  return isCookieSession(sessionToken)
}
