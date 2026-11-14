/** Hashtags / keywords that mark a clip as music — skip Whisper CC (same policy as backend). */
const MUSIC_HASHTAGS = new Set([
  'music',
  'song',
  'lyrics',
  'lyric',
  'lyricvideo',
  'lofi',
  'karaoke',
  'remix',
  'cover',
  'edm',
  'hiphop',
  'rap',
  'ballad',
  'kpop',
  'vpop',
  'nhac',
  'amnhac',
  'nhachay',
  'nhachaymoingay',
  'nhacviet',
  'baihat',
  'singing',
  'soundtrack',
  'ost',
  'chillmusic',
  'lofimusic',
])

const MUSIC_KEYWORDS = [
  'music',
  'song',
  'lyrics',
  'lyric',
  'lofi',
  'karaoke',
  'remix',
  'cover',
  'edm',
  'hiphop',
  'ballad',
  'kpop',
  'vpop',
  'am nhac',
  'amnhac',
  'nhac',
  'bai hat',
  'baihat',
  'nhac hay',
  'nhachay',
  'soundtrack',
  'melody',
]

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
}

function normalizeToken(raw) {
  return stripDiacritics(raw)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function usableAudioTitle(audioTitle) {
  const raw = String(audioTitle ?? '').trim()
  if (!raw) return ''
  const normalized = normalizeToken(raw)
  if (
    normalized.startsWith('original sound') ||
    normalized.startsWith('am thanh goc')
  ) {
    return ''
  }
  return raw
}

/**
 * Music / lyric clips should not request or show timed ASR captions.
 */
export function isMusicVideoForCaptions(video) {
  const haystack = [
    video?.title,
    video?.description,
    usableAudioTitle(video?.audioTitle),
  ]
    .map((part) => String(part ?? ''))
    .join(' ')
  if (!haystack.trim()) return false

  const hashtagMatches = haystack.match(/#([\p{L}\p{N}_]+)/gu) ?? []
  for (const raw of hashtagMatches) {
    const tag = normalizeToken(raw.replace(/^#/, ''))
    if (!tag) continue
    if (MUSIC_HASHTAGS.has(tag)) return true
    for (const musicTag of MUSIC_HASHTAGS) {
      if (tag.includes(musicTag)) return true
    }
  }

  const normalized = normalizeToken(haystack)
  const compact = normalized.replace(/\s+/g, '')
  for (const kw of MUSIC_KEYWORDS) {
    const needle = normalizeToken(kw)
    if (!needle) continue
    if (needle.includes(' ')) {
      if (normalized.includes(needle)) return true
    } else if (compact.includes(needle.replace(/\s+/g, ''))) {
      return true
    }
  }
  return false
}
