import { resolveApiBaseUrl } from '../config/apiBase.js'

const API_BASE_URL = resolveApiBaseUrl()

const ERROR_MESSAGES_VI = {
  AUTH_REQUIRED: 'Bạn cần đăng nhập để tiếp tục.',
  ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.',
  VALIDATION_ERROR: 'Dữ liệu gửi lên chưa hợp lệ.',
  BAD_REQUEST: 'Yêu cầu chưa hợp lệ, vui lòng kiểm tra lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  INTERNAL_SERVER_ERROR: 'Hệ thống đang bận, vui lòng thử lại sau.',
}

function localizeError(code, fallbackMessage) {
  if (code && ERROR_MESSAGES_VI[code]) {
    return ERROR_MESSAGES_VI[code]
  }
  return fallbackMessage
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = `Yêu cầu thất bại (mã ${response.status})`
    let code
    try {
      const payload = await response.json()
      code = payload?.error?.code
      if (payload?.error?.message) {
        message = payload.error.message
      } else if (payload?.message) {
        message = payload.message
      }
    } catch {
      // Keep default message when response is not JSON.
    }
    throw new Error(localizeError(code, message))
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.json()
  if (Object.prototype.hasOwnProperty.call(payload, 'success')) {
    if (!payload.success) {
      const code = payload?.error?.code
      const fallbackMessage = payload?.error?.message ?? 'Yêu cầu thất bại'
      throw new Error(localizeError(code, fallbackMessage))
    }
    return payload.data
  }
  return payload
}

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value))
    }
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export const apiClient = {
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  refresh: (refreshToken) => request('/api/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken) => request('/api/auth/logout', { method: 'POST', body: { refreshToken } }),
  sendCode: (payload) => request('/api/auth/send-code', { method: 'POST', body: payload }),
  verifyCode: (payload) => request('/api/auth/verify-code', { method: 'POST', body: payload }),
  exchangeOAuthCode: (code) =>
    request('/api/auth/oauth/exchange', { method: 'POST', body: { code } }),
  me: (token) => request('/api/auth/me', { token }),
  updateMyProfile: (token, payload) =>
    request('/api/users/me', { method: 'PUT', token, body: payload }),
  checkUsername: (username) => request(`/api/users/check-username${toQuery({ username })}`),
  getPublicProfile: (username) => request(`/api/users/${encodeURIComponent(username)}`),
  getFeed: ({ page = 0, size = 10, sort = 'latest' } = {}) =>
    request(`/api/feed${toQuery({ page, size, sort })}`),
  getFollowingFeed: (token, { page = 0, size = 10 } = {}) =>
    request(`/api/feed/following${toQuery({ page, size })}`, { token }),
  createVideo: (payload, token) => request('/api/videos', { method: 'POST', body: payload, token }),
  likeVideo: (videoId, token) => request(`/api/videos/${videoId}/likes`, { method: 'POST', token }),
  unlikeVideo: (videoId, token) => request(`/api/videos/${videoId}/likes`, { method: 'DELETE', token }),
  bookmarkVideo: (videoId, token) =>
    request(`/api/videos/${videoId}/bookmarks`, { method: 'POST', token }),
  unbookmarkVideo: (videoId, token) =>
    request(`/api/videos/${videoId}/bookmarks`, { method: 'DELETE', token }),
  getVideoMeState: (videoId, token) => request(`/api/videos/${videoId}/me`, { token }),
  getMyLikedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/liked-videos${toQuery({ page, size })}`, { token }),
  getMyBookmarkedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/bookmarked-videos${toQuery({ page, size })}`, { token }),
  getComments: (videoId) => request(`/api/videos/${videoId}/comments`),
  addComment: (videoId, content, token) =>
    request(`/api/videos/${videoId}/comments`, {
      method: 'POST',
      body: { content },
      token,
    }),
  reportVideo: (videoId, reason, token) =>
    request(`/api/videos/${videoId}/report`, {
      method: 'POST',
      body: { reason },
      token,
    }),
  follow: (userId, token) => request(`/api/follows/${userId}`, { method: 'POST', token }),
  unfollow: (userId, token) => request(`/api/follows/${userId}`, { method: 'DELETE', token }),
}
