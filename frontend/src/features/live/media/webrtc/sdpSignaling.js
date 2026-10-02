import { LIVE_MEDIA_ERROR, LiveMediaError } from '@/features/live/media/mediaErrors.js'

/**
 * WHIP (publish) / WHEP (play) signaling against SRS: one SDP offer/answer over HTTP.
 * The endpoint URL (including its single-use or short-lived token) comes from the
 * backend; it is never built or stored on the client.
 *
 * SRS answers 201 + `application/sdp` and a `Location` header for the session resource;
 * DELETE on that resource stops the session right away instead of waiting for the
 * STUN timeout. On any refusal (hook denied, stream busy, bad SDP) SRS closes the
 * connection without a status, which reaches the browser as a network error or a 502.
 */

const SDP_CONTENT_TYPE = 'application/sdp'

function resolveResourceUrl(location, endpointUrl) {
  if (!location) return null
  try {
    const base = typeof window !== 'undefined' ? new URL(endpointUrl, window.location.href) : new URL(endpointUrl)
    return new URL(location, base).toString()
  } catch {
    return null
  }
}

/**
 * @returns {Promise<{ answer: string, resourceUrl: string|null }>}
 * @throws {LiveMediaError} PUBLISH_REJECTED for 4xx (token/permission refused by the backend hook),
 *   SERVER_UNAVAILABLE for 5xx or network failures.
 */
export async function exchangeSdp(endpointUrl, offerSdp, { signal } = {}) {
  let response
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': SDP_CONTENT_TYPE, Accept: SDP_CONTENT_TYPE },
      body: offerSdp,
      credentials: 'omit',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new LiveMediaError(LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE, { cause: error })
  }

  if (response.status >= 500) {
    throw new LiveMediaError(LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE)
  }
  const answer = response.ok ? await response.text() : ''
  if (!response.ok || !answer.trimStart().startsWith('v=')) {
    throw new LiveMediaError(LIVE_MEDIA_ERROR.PUBLISH_REJECTED)
  }
  return { answer, resourceUrl: resolveResourceUrl(response.headers.get('Location'), endpointUrl) }
}

/** Best-effort session teardown; `keepalive` lets it finish while the page unloads. */
export function deleteSdpResource(resourceUrl) {
  if (!resourceUrl) return
  try {
    void fetch(resourceUrl, { method: 'DELETE', credentials: 'omit', keepalive: true }).catch(() => {})
  } catch {
    // ignore: the media server expires the session on its own
  }
}
