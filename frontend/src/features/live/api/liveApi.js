import { request, toQuery } from '@/shared/api/http.js'

/**
 * REST client for the LIVE domain (Spring Boot). Every method mirrors
 * `mock/liveMockService.js` so `services/liveService.js` can swap them.
 *
 * Video never flows through these endpoints — playback URLs point to the media server.
 */
export const liveApi = {
  /** @returns {Promise<import('./liveContracts.js').LiveDiscovery>} */
  getDiscovery: ({ category } = {}, token) =>
    request(`/api/lives/discovery${toQuery({ category })}`, { token }),

  /** @returns {Promise<import('./liveContracts.js').LiveListPage>} */
  getLives: (query = {}, token) => request(`/api/lives${toQuery(query)}`, { token }),

  /** @returns {Promise<import('./liveContracts.js').LiveDetail>} */
  getLive: (liveId, token) => request(`/api/lives/${encodeURIComponent(liveId)}`, { token }),

  /**
   * The cover must be uploaded to storage first (presigned URL, like video uploads);
   * only the resulting `coverKey` is sent, never the file itself.
   * @param {import('./liveContracts.js').CreateLivePayload & { coverKey?: string|null }} payload
   * @returns {Promise<import('./liveContracts.js').LiveDetail>}
   */
  // eslint-disable-next-line no-unused-vars
  createLive: ({ coverFile, coverKey = null, ...payload }, token) =>
    request('/api/lives', { method: 'POST', body: { ...payload, coverKey }, token }),

  startLive: (liveId, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/start`, { method: 'POST', token }),

  endLive: (liveId, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/end`, { method: 'POST', token }),

  /** Aggregated taps — one request per batch window, never per click. */
  sendLikes: (liveId, count, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/like`, { method: 'POST', body: { count }, token }),

  followHost: (liveId, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/follow`, { method: 'POST', token }),

  unfollowHost: (liveId, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/follow`, { method: 'DELETE', token }),

  /** REST fallback; the realtime path sends comments through the room channel. */
  postComment: (liveId, text, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/comments`, { method: 'POST', body: { text }, token }),

  getGiftCatalog: (token) => request('/api/lives/gifts', { token }),

  sendGift: (liveId, giftId, token) =>
    request(`/api/lives/${encodeURIComponent(liveId)}/gifts`, { method: 'POST', body: { giftId }, token }),
}
