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
 * Cookie session: ws-ticket trả JWT (tự refresh nếu access hết hạn).
 * Không gọi /refresh riêng — tránh 400 khi refresh cookie đã chết.
 */
export async function resolveRealtimeWsToken(sessionToken) {
  if (!sessionToken) return null
  if (!isCookieSession(sessionToken)) return sessionToken

  try {
    const data = await apiClient.wsTicket()
    if (data?.token) return data.token
  } catch (err) {
    if (err?.status === 400 || err?.status === 401) {
      throw new SessionExpiredError()
    }
    return null
  }

  return sessionToken
}

export function usesCookieWebSocketAuth(sessionToken) {
  return isCookieSession(sessionToken)
}
