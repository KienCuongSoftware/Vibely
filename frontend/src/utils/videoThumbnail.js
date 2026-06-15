/** Max width for stored video posters (sharp on retina grid, reasonable file size). */
export const THUMBNAIL_MAX_WIDTH = 1280
export const THUMBNAIL_JPEG_QUALITY = 0.92

export function computeThumbnailDimensions(
  videoWidth,
  videoHeight,
  maxWidth = THUMBNAIL_MAX_WIDTH,
) {
  const w = Math.max(1, Number(videoWidth) || 1)
  const h = Math.max(1, Number(videoHeight) || 1)
  if (w <= maxWidth) {
    return { width: w, height: h }
  }
  const scale = maxWidth / w
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(h * scale)),
  }
}

export function drawVideoFrameToCanvas(video, canvas, maxWidth = THUMBNAIL_MAX_WIDTH) {
  const { width, height } = computeThumbnailDimensions(
    video.videoWidth,
    video.videoHeight,
    maxWidth,
  )
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Không thể tạo canvas thumbnail.')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(video, 0, 0, width, height)
  return ctx
}

export function canvasToJpegBlob(canvas, quality = THUMBNAIL_JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không thể tạo ảnh thumbnail.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Extract a high-quality JPEG poster from a local video file.
 */
export function extractThumbnailBlobFromFile(file, atSecond = 1, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    let watchdog = null

    const cleanup = () => {
      if (watchdog != null) {
        clearTimeout(watchdog)
        watchdog = null
      }
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }

    const done = (cb, value) => {
      if (settled) return
      settled = true
      cleanup()
      cb(value)
    }

    const drawAndResolve = async () => {
      if (settled) return
      try {
        const w = video.videoWidth || 0
        const h = video.videoHeight || 0
        if (w < 2 || h < 2) {
          done(reject, new Error('Không thể đọc khung hình video (kích thước 0).'))
          return
        }
        const canvas = document.createElement('canvas')
        drawVideoFrameToCanvas(video, canvas)
        const blob = await canvasToJpegBlob(canvas)
        done(resolve, blob)
      } catch (err) {
        done(reject, err instanceof Error ? err : new Error('Không thể cắt thumbnail.'))
      }
    }

    const scheduleWatchdog = () => {
      if (watchdog != null) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        if (settled) return
        if (video.readyState >= 2 && (video.videoWidth || 0) >= 2 && (video.videoHeight || 0) >= 2) {
          drawAndResolve()
          return
        }
        done(reject, new Error('Hết thời gian khi tạo ảnh bìa tự động.'))
      }, timeoutMs)
    }

    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0)
      const finite = Number.isFinite(duration) && duration > 0
      let seekTo
      if (finite) {
        const cap = Math.min(duration * 0.999, Math.max(duration - 0.04, 0.02))
        const fromDuration = Math.min(duration * 0.25, cap)
        const fromAt = Math.min(Math.max(atSecond, 0.1), cap)
        seekTo = Math.min(fromDuration, fromAt)
        seekTo = Math.max(seekTo, Math.min(0.1, cap))
        if (Math.abs(seekTo - video.currentTime) < 0.001) {
          seekTo = Math.min(seekTo + 0.05, cap)
        }
        if (!Number.isFinite(seekTo) || seekTo < 0) {
          seekTo = Math.min(0.05, cap)
        }
      } else {
        seekTo = Math.min(Math.max(atSecond, 0.05), 1)
      }
      scheduleWatchdog()
      try {
        video.currentTime = seekTo
      } catch {
        drawAndResolve()
      }
    }

    video.onseeked = () => {
      drawAndResolve()
    }

    video.onerror = () => {
      done(reject, new Error('Không thể đọc video để tạo thumbnail.'))
    }

    video.src = url
    video.load()
    scheduleWatchdog()
  })
}
