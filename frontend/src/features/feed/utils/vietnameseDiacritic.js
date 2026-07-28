/** Phục hồi dấu tiếng Việt — phát hiện caption gần như không dấu. */

const VI_DIACRITIC_RE =
  /[ăâêôơưđĂÂÊÔƠƯĐáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i

const VN_MARKER_TOKENS = new Set([
  'va',
  'cua',
  'khong',
  'duoc',
  'mot',
  'nhung',
  'nhieu',
  'rat',
  'nguoi',
  'toi',
  'ban',
  'nay',
  'nhac',
  'hay',
  'moi',
  'ngay',
  'dem',
  'yeu',
  'thich',
  'thương',
  'thuong',
  'nho',
  'buon',
  'vui',
  'dep',
  'bai',
  'hat',
  'am',
  'thanh',
  'goc',
  'viet',
  'nam',
  'son',
  'thuy',
  'trung',
  'may',
  'dong',
  'chung',
  'tinh',
  'roi',
  'nhe',
  'oi',
  'lam',
  'sao',
  'the',
  'nao',
  'dau',
  'co',
  'de',
  'se',
  'da',
  'dang',
  'voi',
  'cho',
  'trong',
  'ngoai',
  'nhu',
  'thi',
  'la',
])

/** Token trông giống âm tiết tiếng Việt (không dấu). */
const VN_SYLLABLE_RE =
  /^(ng|ngh|nh|th|tr|ph|kh|gh|gi|qu|ch|[bcdghklmnpqrstvx])?[aeiouy]+[cmnpt]?$/i

export const VI_DIACRITIC_TARGET_LANG = 'vi-diacritic'

/**
 * Caption Latin ít/không dấu, có tín hiệu tiếng Việt → gợi ý «Xem bản có dấu».
 */
export function looksLikeUnaccentedVietnamese(text) {
  const s = String(text ?? '').trim()
  if (s.length < 4) return false
  if (VI_DIACRITIC_RE.test(s)) return false

  const tokens = s.toLowerCase().match(/[a-z]+/g) || []
  if (tokens.length === 0) return false

  const letterCount = tokens.reduce((n, t) => n + t.length, 0)
  if (letterCount < 6) return false

  let markerHits = 0
  let syllableHits = 0
  for (const token of tokens) {
    if (token.length < 2) continue
    if (VN_MARKER_TOKENS.has(token)) markerHits += 1
    if (token.length >= 2 && token.length <= 7 && VN_SYLLABLE_RE.test(token)) {
      syllableHits += 1
    }
  }

  if (markerHits >= 1) return true
  if (syllableHits >= 2 && syllableHits / tokens.length >= 0.4) return true
  return false
}
