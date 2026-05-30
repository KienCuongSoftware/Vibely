const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|mkv|m4v|avi)$/i

/**
 * Label for studio post header: original upload filename when possible.
 */
export function resolveUploadedFileLabel(video) {
  if (!video) return 'Bài đăng'

  const fromUrl = fileNameFromUrl(video.videoUrl)
  if (fromUrl) return fromUrl

  const title = String(video.title ?? '').trim()
  if (!title) return 'Video'
  if (VIDEO_EXT_PATTERN.test(title)) return title
  return `${title}.mp4`
}

function fileNameFromUrl(rawUrl) {
  const url = String(rawUrl ?? '').trim()
  if (!url) return ''

  try {
    const path = decodeURIComponent(new URL(url, 'http://local').pathname)
    const segment = path.split('/').filter(Boolean).pop() ?? ''
    return segment.split('?')[0].split('#')[0].trim()
  } catch {
    const segment = url.split('/').pop() ?? ''
    try {
      return decodeURIComponent(segment.split('?')[0].split('#')[0].trim())
    } catch {
      return segment.split('?')[0].split('#')[0].trim()
    }
  }
}
