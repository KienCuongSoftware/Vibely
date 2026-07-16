import { apiClient } from '../api/client.js'
import { isCookieSession } from '../auth/session.js'

export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED')
    this.name = 'SessionExpiredError'
    this.status = 401
  }
}

let cachedOkUntil = 0
let cachedSessionToken = null
let inFlight = null

/**
 * Verifies the session before opening `/ws`. Caches success briefly to avoid
 * hammering /api/auth/ws-ticket (which was causing 429 storms with reconnect loops).
 */
export async function resolveRealtimeWsToken(sessionToken) {
  if (!sessionToken) return null

  const now = Date.now()
  if (
    cachedSessionToken === sessionToken &&
    now < cachedOkUntil
  ) {
    return sessionToken
  }

  if (inFlight) {
    return inFlight
  }

  inFlight = (async () => {
    try {
      const ticket = await apiClient.wsTicket(
        isCookieSession(sessionToken) ? undefined : sessionToken,
      )
      if (!ticket?.token) {
        throw new SessionExpiredError()
      }
      cachedSessionToken = sessionToken
      cachedOkUntil = Date.now() + 5 * 60 * 1000
      return sessionToken
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        throw err
      }
      if (err?.status === 400 || err?.status === 401) {
        throw new SessionExpiredError()
      }
      // 429 / network — back off cache so we don't retry immediately in a tight loop.
      if (err?.status === 429 || err?.code === 'RATE_LIMITED') {
        cachedSessionToken = sessionToken
        cachedOkUntil = Date.now() + 60 * 1000
        return null
      }
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

export function usesCookieWebSocketAuth(sessionToken) {
  return isCookieSession(sessionToken)
}

export function clearWsTicketCache() {
  cachedOkUntil = 0
  cachedSessionToken = null
}
