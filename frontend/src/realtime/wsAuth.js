import { apiClient } from '../api/client.js'
import { isCookieSession } from '../auth/session.js'

/** Resolves a JWT suitable for the WebSocket `?token=` handshake. */
async function fetchWsTicket() {
  const data = await apiClient.wsTicket()
  return data?.token ?? null
}

export async function resolveRealtimeWsToken(sessionToken) {
  if (!sessionToken) return null
  if (!isCookieSession(sessionToken)) return sessionToken
  try {
    return await fetchWsTicket()
  } catch {
    // ws-ticket already refreshes cookies server-side when possible
    return null
  }
}
