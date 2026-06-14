/** Caption hiển thị / share — bỏ tên file upload (snaptik, .mp4, …). */
export function isJunkCaption(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return true
  if (/https?:\/\//i.test(s)) return true
  if (/\.(mp4|webm|mov)(\?|$)/i.test(s)) return true
  if (
    /snaptik|snaplik|ssstik|tikmate|savetik|tiktokcdn|instagram|fbcdn|facebook\.com\//i.test(
      s,
    )
  )
    return true
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}[_-]\d{8,}$/i.test(s)) return true
  return false
}

/** Giống caption trên trang watch — ưu tiên title hợp lệ, không thì mô tả. */
export function pickShareCaption({ title = '', description = '' } = {}) {
  const ttl = String(title ?? '').trim()
  const desc = String(description ?? '').trim()
  const pick = !isJunkCaption(ttl) ? ttl : !isJunkCaption(desc) ? desc : ''
  if (!pick) return ''
  if (pick.length > 300) return `${pick.slice(0, 297)}…`
  return pick
}
