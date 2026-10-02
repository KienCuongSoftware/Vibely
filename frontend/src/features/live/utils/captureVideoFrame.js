import { LIVE_COVER_SNAPSHOT } from '@/features/live/constants/liveConstants.js'

/**
 * Current frame of a playing <video> as an image File (the un-mirrored camera image, as
 * viewers see it). Resolves null when no frame is available; never throws.
 * @param {HTMLVideoElement|null} video
 * @returns {Promise<File|null>}
 */
export async function captureVideoFrame(video, { maxWidth = LIVE_COVER_SNAPSHOT.MAX_WIDTH } = {}) {
  const width = video?.videoWidth ?? 0
  const height = video?.videoHeight ?? 0
  if (!width || !height || typeof document === 'undefined') return null
  try {
    const scale = Math.min(1, maxWidth / width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, LIVE_COVER_SNAPSHOT.TYPE, LIVE_COVER_SNAPSHOT.QUALITY)
    })
    return blob ? new File([blob], 'live-cover.jpg', { type: LIVE_COVER_SNAPSHOT.TYPE }) : null
  } catch {
    return null
  }
}
