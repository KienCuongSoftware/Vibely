/** Helpers cho thời điểm hẹn đăng (`scheduledAt`) — dùng chung Studio + Hồ sơ. */

export function readScheduledAt(video) {
  if (!video || typeof video !== 'object') return null
  return video.scheduledAt ?? video.scheduled_at ?? null
}

export function parseScheduleDate(raw) {
  if (raw == null || raw === '') return null
  if (Array.isArray(raw) && raw.length >= 3) {
    // Rare Jackson timestamp array: [y, m, d, h, min, s, nano]
    const [y, m, day, h = 0, min = 0, s = 0] = raw
    const d = new Date(Date.UTC(y, m - 1, day, h, min, s))
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'object') {
    // Some serializers nest epoch seconds
    if (typeof raw.epochSecond === 'number') {
      const d = new Date(raw.epochSecond * 1000)
      return Number.isNaN(d.getTime()) ? null : d
    }
    return null
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isFutureSchedule(raw) {
  const d = parseScheduleDate(raw)
  return Boolean(d && d.getTime() > Date.now())
}

/** Nhãn kiểu TikTok trên thumbnail: `2026-9-8 9:30` theo giờ máy người xem. */
export function formatScheduleTileLabel(raw) {
  const d = parseScheduleDate(raw)
  if (!d) return ''
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${minutes}`
}
