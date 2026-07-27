/** Trang Đề xuất (For You) — URL gốc, không dùng /foryou trên thanh địa chỉ. */
export const FOR_YOU_PATH = '/'

/** Alias cũ; giữ để bookmark/redirect. */
export const FOR_YOU_ALIAS_PATH = '/foryou'

export function forYouHref(query = '') {
  const q = String(query ?? '').trim()
  if (!q) return FOR_YOU_PATH
  return q.startsWith('?') ? `${FOR_YOU_PATH}${q}` : `${FOR_YOU_PATH}?${q}`
}
