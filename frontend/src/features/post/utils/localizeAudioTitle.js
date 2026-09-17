/**
 * Stored `audioTitle` is often frozen in the uploader's locale
 * (e.g. "âm thanh gốc - Name"). Relocalize original-sound titles for the UI locale.
 */

const ORIGINAL_SOUND_PREFIXES = [
  'alkuperainen aani',
  'am thanh goc',
  'eredeti hang',
  'fuaim bhunaidh',
  'nhac goc',
  'nhac nen',
  'original sound',
  'originaljud',
  'originallyd',
  'originalton',
  'origineel geluid',
  'orijinal ses',
  'oryginalny dzwiek',
  'sauti asilia',
  'so original',
  'som original',
  'son original',
  'sonido original',
  'suara asli',
  'sunet original',
  'suono originale',
  'tingull origjinal',
  'αρχικος ηχος',
  'оригинальныи звук',
  'оригінальнии звук',
  'סאונד מקורי',
  'צליל מקורי',
  'اصل اواز',
  'الصوت الاصلي',
  'صوت اصلي',
  'मल धवन',
  'मल सउड',
  'মল সউনড',
  'เสยงตนฉบบ',
  '원본 사운드',
  'オリジナルサウンド',
  '原声',
  '原聲',
]

export function foldAudioTitleToken(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/^♫\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Stable DB form — always English; UI localizes via {@link localizeAudioTitle}. */
export function canonicalOriginalSoundTitle(name) {
  const n = String(name ?? '').trim() || 'Vibely'
  return `original sound - ${n}`
}

export function isOriginalSoundTitle(rawTitle) {
  const title = String(rawTitle ?? '').trim()
  if (!title) return false
  const folded = foldAudioTitleToken(title)
  if (ORIGINAL_SOUND_PREFIXES.some((p) => folded === p || folded.startsWith(`${p} `) || folded.startsWith(`${p}-`) || folded.startsWith(`${p} -`))) {
    return true
  }
  const dash = title.replace(/^♫\s*/, '').match(/^(.+?)\s*[-–—]\s*.+$/)
  if (!dash) return false
  const left = foldAudioTitleToken(dash[1])
  return ORIGINAL_SOUND_PREFIXES.some((p) => left === p)
}

function extractOriginalSoundName(rawTitle, fallbackName) {
  const title = String(rawTitle ?? '').trim().replace(/^♫\s*/, '')
  const dash = title.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (dash) {
    const name = dash[2].trim().replace(/^@/, '')
    if (name) return name
  }
  return fallbackName
}

/**
 * @param {string|null|undefined} rawTitle
 * @param {(key: string, opts?: object) => string} t
 * @param {{ name?: string, key?: string, keepRawIfCustom?: boolean }} [options]
 */
export function localizeAudioTitle(rawTitle, t, options = {}) {
  const fallbackName = String(options.name ?? 'Vibely').trim() || 'Vibely'
  const key = options.key || 'upload.originalAudio'
  const keepRawIfCustom = options.keepRawIfCustom !== false
  const title = String(rawTitle ?? '').trim()

  if (!title) {
    return t(key, { name: fallbackName })
  }
  if (isOriginalSoundTitle(title)) {
    return t(key, { name: extractOriginalSoundName(title, fallbackName) })
  }
  if (keepRawIfCustom) {
    return title
  }
  return t(key, { name: fallbackName })
}
