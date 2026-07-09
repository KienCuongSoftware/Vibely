/**
 * Parse API date/time values. Java {@code LocalDateTime} is serialized without offset;
 * production stores UTC wall-clock — append {@code Z} so browsers in VN (+7) show correct relative time.
 */
export function parseApiDateTime(isoOrMs) {
  if (isoOrMs == null) return null
  if (isoOrMs instanceof Date) {
    return Number.isNaN(isoOrMs.getTime()) ? null : isoOrMs
  }
  if (typeof isoOrMs === 'number') {
    const d = new Date(isoOrMs)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const raw = String(isoOrMs).trim()
  if (!raw) return null

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const normalized = raw.includes('T') ? raw : `${raw}T00:00:00`
  const d = new Date(`${normalized}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatRelativeTimeVi(isoOrMs) {
  const d = parseApiDateTime(isoOrMs)
  if (!d) return ''

  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 45) return 'Vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  if (day < 14) return `${day} ngày trước`
  return d.toLocaleDateString('vi-VN')
}
