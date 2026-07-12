/** Hard limits shown on Studio Upload (must match UI copy). */
export const MAX_VIDEO_UPLOAD_BYTES = 30 * 1024 * 1024 * 1024 // 30 GB
export const MAX_VIDEO_DURATION_SECONDS = 60 * 60 // 60 minutes

const ALLOWED_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const ALLOWED_EXT = /\.(mp4|m4v|webm|mov)$/i

/**
 * @param {File | null | undefined} file
 * @returns {string | null} error message, or null if OK
 */
export function validateVideoFileBasics(file) {
  if (!file) return 'Vui lòng chọn một tệp video.'

  const type = String(file.type || '').toLowerCase().trim()
  const name = String(file.name || '')
  const hasAllowedMime = type && (ALLOWED_MIME.has(type) || type === 'video/x-m4v')
  const hasAllowedExt = ALLOWED_EXT.test(name)

  if (!hasAllowedMime && !hasAllowedExt) {
    return 'Định dạng không được hỗ trợ. Chỉ chấp nhận .mp4, .mov hoặc .webm.'
  }
  if (!(type.startsWith('video/') || hasAllowedExt)) {
    return 'Tệp đã chọn không phải video hợp lệ.'
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'Tệp video không hợp lệ hoặc đang trống.'
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return 'Video vượt quá giới hạn 30 GB. Vui lòng chọn video nhỏ hơn.'
  }
  return null
}

/**
 * @param {{ duration?: number, width?: number, height?: number }} meta
 * @returns {string | null}
 */
export function validateVideoMetadata(meta) {
  const duration = Number(meta?.duration)
  if (!Number.isFinite(duration) || duration <= 0) {
    return 'Không đọc được thời lượng video. Vui lòng chọn tệp khác.'
  }
  if (duration === Number.POSITIVE_INFINITY) {
    return 'Video này không có thời lượng cố định nên không thể tải lên.'
  }
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    return 'Video vượt quá thời lượng tối đa 60 phút. Vui lòng cắt ngắn rồi chọn video khác.'
  }
  return null
}

/** @param {string | null | undefined} message */
export function isDurationLimitRejectMessage(message) {
  const text = String(message || '').toLowerCase()
  return text.includes('60 phút') || text.includes('thời lượng tối đa')
}

/**
 * Prefer a content-type the backend accepts.
 * @param {File} file
 */
export function resolveUploadContentType(file) {
  const type = String(file?.type || '').toLowerCase().trim()
  if (ALLOWED_MIME.has(type)) return type
  if (type === 'video/x-m4v') return 'video/mp4'
  const name = String(file?.name || '')
  if (/\.webm$/i.test(name)) return 'video/webm'
  if (/\.mov$/i.test(name)) return 'video/quicktime'
  return 'video/mp4'
}
