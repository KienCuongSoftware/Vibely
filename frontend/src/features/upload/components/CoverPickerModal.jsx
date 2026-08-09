import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  IoAdd,
  IoArrowBack,
  IoBatteryFullOutline,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoTextOutline,
} from 'react-icons/io5'
import { LuWifi } from 'react-icons/lu'
import { uploadThumbnailToStorage } from '@/shared/api/client'
import {
  THUMBNAIL_MAX_WIDTH,
  canvasToJpegBlob,
  drawVideoFrameToCanvas,
} from '@/features/post/utils/videoThumbnail.js'

const FRAME_COUNT = 96
/** Filmstrip capture — sharp enough for small thumbs + interim large preview. */
const FILMSTRIP_CAPTURE_WIDTH = 480
const FILMSTRIP_JPEG_QUALITY = 0.9
/** Large modal preview capture (display is smaller; keep retina-sharp). */
const PREVIEW_MAX_WIDTH = 960
const PREVIEW_JPEG_QUALITY = 0.96
/** Final cover upload quality. */
const COVER_EXPORT_JPEG_QUALITY = 0.97
const COVER_EXPORT_MAX_WIDTH = Math.max(THUMBNAIL_MAX_WIDTH, 1440)

/** TikTok-style sample assets for cover editor profile phone mock. */
const COVER_PREVIEW_AVATAR = '/images/video-peview/avatar-user-preview.png'
const COVER_PREVIEW_TOP_PHONE = '/images/video-peview/top-phone.png'
const COVER_PREVIEW_DISPLAY_NAME = 'Người Ổn Bất Tỉnh'

/** Stickers chữ/banner kiểu TikTok Studio (ảnh nền trong suốt). */
const COVER_STICKERS = [
  '4c79db00-268d-48e2-b9fe-7c3b7bc2707d.png',
  '7f474bee-88ce-461c-a347-843cea4145f4.png',
  '41dd55c0-fe15-47dd-b954-fd9ca564ee68.png',
  '565d8583-44a3-477d-95e1-25a681de7d89.png',
  '8105a2c6-de42-4a3b-8dc7-86ba50be90b1.png',
  'a2f22926-b7ce-4170-bd54-0835a000cfb2.png',
  'bf540eca-2aa4-4fb2-a0c3-324cf115c51c.png',
  'a9ab0427-53f6-4f35-9755-08facadb1286.png',
  'd3569db3-e6b1-4995-8d64-b2282aecdcab.png',
  'e6bd373d-b3f5-45fb-944d-1fa4d1b07add.png',
].map((file) => ({
  id: file.replace(/\.png$/i, ''),
  src: `/images/text-preview/${file}`,
}))

const DEFAULT_STICKER_WIDTH_PCT = 46

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không tải được sticker.'))
    img.src = src
  })
}

/** Ghép sticker lên ảnh bìa trước khi upload (tọa độ % theo khung canvas). */
async function compositeCoverWithSticker(baseBlob, sticker) {
  if (!sticker?.src) return baseBlob
  const baseUrl = URL.createObjectURL(baseBlob)
  try {
    const [baseImg, stickerImg] = await Promise.all([
      loadHtmlImage(baseUrl),
      loadHtmlImage(sticker.src),
    ])
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, baseImg.naturalWidth || baseImg.width)
    canvas.height = Math.max(1, baseImg.naturalHeight || baseImg.height)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)

    const wPct = Math.min(90, Math.max(12, Number(sticker.wPct) || DEFAULT_STICKER_WIDTH_PCT))
    const drawW = (wPct / 100) * canvas.width
    const aspect =
      (stickerImg.naturalHeight || stickerImg.height) /
      Math.max(1, stickerImg.naturalWidth || stickerImg.width)
    const drawH = drawW * aspect
    const cx = ((Number(sticker.xPct) || 50) / 100) * canvas.width
    const cy = ((Number(sticker.yPct) || 50) / 100) * canvas.height
    ctx.drawImage(stickerImg, cx - drawW / 2, cy - drawH / 2, drawW, drawH)

    const out = await canvasToJpegBlob(canvas, COVER_EXPORT_JPEG_QUALITY)
    return out
  } finally {
    URL.revokeObjectURL(baseUrl)
  }
}

function waitSeeked(video) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
  })
}

/** @param {File | string} source File cục bộ hoặc URL phát video (không tải cả file trước). */
function createVideoFromSource(source) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  let cleanup = () => {}
  if (source instanceof File) {
    const objectUrl = URL.createObjectURL(source)
    video.src = objectUrl
    cleanup = () => URL.revokeObjectURL(objectUrl)
  } else {
    video.crossOrigin = 'anonymous'
    video.src = String(source)
  }
  return { video, cleanup }
}

async function loadVideoMetadata(video, errorMessage = 'Không tải được video.') {
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error(errorMessage))
  })
}

async function extractVideoFilmstrip(videoSource, frameCount = FRAME_COUNT) {
  const { video, cleanup } = createVideoFromSource(videoSource)
  await loadVideoMetadata(video)
  const duration = Math.max(0.08, Number(video.duration) || 1)
  const canvas = document.createElement('canvas')
  const vw = video.videoWidth || 360
  const vh = video.videoHeight || 640
  const aspect = vh / Math.max(1, vw)
  canvas.width = FILMSTRIP_CAPTURE_WIDTH
  canvas.height = Math.max(1, Math.round(FILMSTRIP_CAPTURE_WIDTH * aspect))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const frames = []
  const n = Math.max(1, frameCount)
  for (let i = 0; i < n; i++) {
    const t =
      n <= 1 ? duration / 2 : (i / (n - 1)) * Math.max(0.01, duration - 0.06) + 0.02
    video.currentTime = Math.min(t, duration - 0.04)
    await waitSeeked(video)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    frames.push({
      time: t,
      dataUrl: canvas.toDataURL('image/jpeg', FILMSTRIP_JPEG_QUALITY),
    })
  }
  cleanup()
  return frames
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** Preview lớn trong modal — trích theo thời điểm, trả về object URL. */
async function extractPreviewFrame(videoSource, timeSeconds, maxWidth = PREVIEW_MAX_WIDTH) {
  const { video, cleanup } = createVideoFromSource(videoSource)
  await loadVideoMetadata(video, 'Không tải được video để xem trước ảnh bìa.')

  const duration = Math.max(0.08, Number(video.duration) || 1)
  const t = Math.max(0, Math.min(Number(timeSeconds || 0), duration - 0.04))
  video.currentTime = t
  await waitSeeked(video)

  const vw = Math.max(1, video.videoWidth || 1080)
  const vh = Math.max(1, video.videoHeight || 1920)
  const targetW = Math.min(maxWidth, vw)
  const targetH = Math.max(1, Math.round(targetW * (vh / vw)))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(video, 0, 0, targetW, targetH)

  const blob = await canvasToJpegBlob(canvas, PREVIEW_JPEG_QUALITY)

  cleanup()
  return URL.createObjectURL(blob)
}

async function extractOriginalResolutionFrame(videoSource, timeSeconds) {
  const { video, cleanup } = createVideoFromSource(videoSource)
  await loadVideoMetadata(video, 'Không tải được video gốc để trích ảnh bìa.')

  const duration = Math.max(0.08, Number(video.duration) || 1)
  const t = Math.max(0, Math.min(Number(timeSeconds || 0), duration - 0.04))
  video.currentTime = t
  await waitSeeked(video)

  const canvas = document.createElement('canvas')
  drawVideoFrameToCanvas(video, canvas, COVER_EXPORT_MAX_WIDTH)

  const blob = await canvasToJpegBlob(canvas, COVER_EXPORT_JPEG_QUALITY)

  cleanup()
  return blob
}

/**
 * Modal chỉnh ảnh bìa kiểu TikTok Studio: Sticker/Text | canvas | preview hồ sơ.
 */
export function CoverPickerModal({
  open,
  onClose,
  videoFile,
  videoUrl,
  token,
  onConfirm,
}) {
  const videoSource = videoFile ?? (String(videoUrl ?? '').trim() || null)
  /** @type {['video' | 'upload', Function]} */
  const [tab, setTab] = useState('video')
  const [toolTab, setToolTab] = useState('sticker')
  const [frames, setFrames] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [stripLoading, setStripLoading] = useState(false)
  const [stripError, setStripError] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [displayPreviewUrl, setDisplayPreviewUrl] = useState('')
  const [scale, setScale] = useState(1)
  /** @type {[null | { id: string, src: string, xPct: number, yPct: number, wPct: number }, Function]} */
  const [activeSticker, setActiveSticker] = useState(null)
  const [stickerSelected, setStickerSelected] = useState(true)
  const previewCacheRef = useRef(new Map())
  const selectedIdxRef = useRef(0)
  const coverImageInputRef = useRef(null)
  const filmstripRef = useRef(null)
  const filmstripTrackRef = useRef(null)
  const canvasStageRef = useRef(null)
  const stickerDragRef = useRef(null)
  const [filmstripAtStart, setFilmstripAtStart] = useState(true)
  const [filmstripAtEnd, setFilmstripAtEnd] = useState(true)

  const syncFilmstripScrollState = useCallback(() => {
    const el = filmstripRef.current
    if (!el) {
      setFilmstripAtStart(true)
      setFilmstripAtEnd(true)
      return
    }
    const { scrollLeft, clientWidth, scrollWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    const hasOverflow = scrollWidth > clientWidth + 2
    if (!hasOverflow) {
      setFilmstripAtStart(true)
      setFilmstripAtEnd(true)
      return
    }
    setFilmstripAtStart(scrollLeft <= 2)
    setFilmstripAtEnd(scrollLeft >= maxScroll - 2)
  }, [])

  const scrollFilmstrip = useCallback((direction) => {
    const el = filmstripRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    if (scrollWidth <= clientWidth + 1) return
    const step = Math.max(120, Math.round(clientWidth * 0.55))
    const target =
      direction > 0 ? Math.min(maxScroll, scrollLeft + step) : Math.max(0, scrollLeft - step)
    el.scrollTo({ left: target, behavior: 'smooth' })
    syncFilmstripScrollState()
    requestAnimationFrame(() => syncFilmstripScrollState())
  }, [syncFilmstripScrollState])

  useEffect(() => {
    selectedIdxRef.current = selectedIdx
  }, [selectedIdx])

  useEffect(() => {
    if (!open) return
    setTab('video')
    setToolTab('sticker')
    setSelectedIdx(0)
    selectedIdxRef.current = 0
    setFrames([])
    setStripError('')
    setUploadFile(null)
    setError('')
    setScale(1)
    setActiveSticker(null)
    setStickerSelected(true)
    setDisplayPreviewUrl('')
    previewCacheRef.current.forEach((cachedUrl) => URL.revokeObjectURL(cachedUrl))
    previewCacheRef.current.clear()
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'video' || !videoSource || !frames.length) {
      if (tab !== 'upload') setDisplayPreviewUrl('')
      return undefined
    }

    const frame = frames[selectedIdx]
    if (!frame) return undefined

    const cacheKey = String(frame.time)
    const cached = previewCacheRef.current.get(cacheKey)
    if (cached) {
      setDisplayPreviewUrl(cached)
      return undefined
    }

    setDisplayPreviewUrl(frame.dataUrl)

    let cancelled = false

    const loadHdPreview = (targetFrame, updateDisplay) => {
      if (!targetFrame) return
      const key = String(targetFrame.time)
      if (previewCacheRef.current.has(key)) return
      extractPreviewFrame(videoSource, targetFrame.time)
        .then((objectUrl) => {
          if (cancelled) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          previewCacheRef.current.set(key, objectUrl)
          if (
            updateDisplay &&
            frames[selectedIdxRef.current]?.time === targetFrame.time
          ) {
            setDisplayPreviewUrl(objectUrl)
          }
        })
        .catch(() => {
          /* giữ preview filmstrip */
        })
    }

    loadHdPreview(frame, true)
    loadHdPreview(frames[selectedIdx - 1], false)
    loadHdPreview(frames[selectedIdx + 1], false)

    return () => {
      cancelled = true
    }
  }, [open, tab, videoSource, frames, selectedIdx])

  useEffect(() => {
    if (!open || !videoSource) {
      setFrames([])
      setStripLoading(false)
      return
    }
    let cancelled = false
    setStripLoading(true)
    setStripError('')
    extractVideoFilmstrip(videoSource, FRAME_COUNT)
      .then((f) => {
        if (!cancelled) {
          setFrames(f)
          setSelectedIdx(0)
        }
      })
      .catch((e) => {
        if (!cancelled) setStripError(e.message ?? 'Không trích xuất được khung hình.')
      })
      .finally(() => {
        if (!cancelled) setStripLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, videoSource])

  useLayoutEffect(() => {
    syncFilmstripScrollState()
  }, [frames, syncFilmstripScrollState])

  useEffect(() => {
    const inner = filmstripTrackRef.current
    const outer = filmstripRef.current
    if (!inner || !frames.length) return
    const ro = new ResizeObserver(() => syncFilmstripScrollState())
    ro.observe(inner)
    if (outer) ro.observe(outer)
    return () => ro.disconnect()
  }, [frames.length, syncFilmstripScrollState, open])

  useEffect(() => {
    return () => {
      previewCacheRef.current.forEach((cachedUrl) => URL.revokeObjectURL(cachedUrl))
      previewCacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl)
    }
  }, [uploadPreviewUrl])

  const onPickImageFile = useCallback((file) => {
    if (!file) return
    const t = file.type || ''
    if (!t.startsWith('image/')) {
      setError('Vui lòng chọn tệp ảnh (JPG, PNG, WebP).')
      return
    }
    setError('')
    setUploadFile(file)
    setTab('upload')
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  const placeSticker = useCallback((preset) => {
    setToolTab('sticker')
    setStickerSelected(true)
    setActiveSticker((prev) => {
      if (prev?.id === preset.id) return prev
      return {
        id: preset.id,
        src: preset.src,
        xPct: prev?.xPct ?? 50,
        yPct: prev?.yPct ?? 48,
        wPct: prev?.wPct ?? DEFAULT_STICKER_WIDTH_PCT,
      }
    })
  }, [])

  const onStickerPointerDown = useCallback((e) => {
    if (!activeSticker || busy) return
    e.preventDefault()
    e.stopPropagation()
    const stage = canvasStageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const pointerId = e.pointerId
    e.currentTarget.setPointerCapture?.(pointerId)
    stickerDragRef.current = {
      mode: 'move',
      pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: activeSticker.xPct,
      origY: activeSticker.yPct,
      origW: activeSticker.wPct,
      stageW: Math.max(1, rect.width),
      stageH: Math.max(1, rect.height),
    }
    setStickerSelected(true)
  }, [activeSticker, busy])

  const onStickerResizePointerDown = useCallback((e) => {
    if (!activeSticker || busy) return
    e.preventDefault()
    e.stopPropagation()
    const stage = canvasStageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const pointerId = e.pointerId
    e.currentTarget.setPointerCapture?.(pointerId)
    stickerDragRef.current = {
      mode: 'resize',
      pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: activeSticker.xPct,
      origY: activeSticker.yPct,
      origW: activeSticker.wPct,
      stageW: Math.max(1, rect.width),
      stageH: Math.max(1, rect.height),
    }
    setStickerSelected(true)
  }, [activeSticker, busy])

  useEffect(() => {
    const onMove = (e) => {
      const drag = stickerDragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (drag.mode === 'move') {
        const xPct = Math.min(92, Math.max(8, drag.origX + (dx / drag.stageW) * 100))
        const yPct = Math.min(92, Math.max(8, drag.origY + (dy / drag.stageH) * 100))
        setActiveSticker((prev) => (prev ? { ...prev, xPct, yPct } : prev))
        return
      }
      const delta = (dx / drag.stageW) * 100
      const wPct = Math.min(85, Math.max(16, drag.origW + delta))
      setActiveSticker((prev) => (prev ? { ...prev, wPct } : prev))
    }
    const onUp = () => {
      stickerDragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const handleConfirm = async () => {
    if (!token) {
      setError('Bạn cần đăng nhập.')
      return
    }
    if (tab === 'video') {
      if (stripLoading || !frames[selectedIdx]?.dataUrl) {
        setError('Chưa có khung hình từ video. Đợi tạo xong hoặc chọn khung hình.')
        return
      }
    } else if (!uploadFile) {
      setError('Hãy chọn ảnh từ máy tính.')
      return
    }
    setBusy(true)
    setError('')
    try {
      let blob
      let fname = 'cover.jpg'

      if (tab === 'video') {
        const frame = frames[selectedIdx]
        if (videoSource) {
          blob = await extractOriginalResolutionFrame(videoSource, frame.time)
        } else {
          blob = await dataUrlToBlob(frame.dataUrl)
          blob = new Blob([blob], { type: 'image/jpeg' })
        }
      } else {
        blob = uploadFile
        fname = uploadFile.name || 'cover.jpg'
      }

      if (activeSticker?.src) {
        blob = await compositeCoverWithSticker(blob, activeSticker)
        fname = 'cover.jpg'
      }

      let url
      try {
        url = await uploadThumbnailToStorage(token, blob, fname)
      } catch (uploadErr) {
        setError(
          uploadErr instanceof Error
            ? uploadErr.message
            : 'Không tải ảnh bìa lên kho lưu trữ. Kiểm tra đăng nhập và thử lại.',
        )
        return
      }
      onConfirm(url, blob)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Không lưu được ảnh bìa.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const previewSrc = tab === 'video' ? displayPreviewUrl : uploadPreviewUrl || undefined

  const canUseVideoTab = Boolean(videoSource)
  const hasVideoCover =
    tab === 'video' &&
    !stripLoading &&
    !stripError &&
    frames.length > 0 &&
    Boolean(frames[selectedIdx]?.dataUrl)
  const hasUploadCover = tab === 'upload' && Boolean(uploadFile)
  const canConfirm = !busy && (hasVideoCover || hasUploadCover)

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-modal-title"
    >
      <div className="flex h-[min(920px,96vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-xl bg-white text-zinc-900 shadow-2xl">
        {/* Header kiểu TikTok */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
              onClick={onClose}
              aria-label="Quay lại"
              disabled={busy}
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <h2 id="cover-modal-title" className="truncate text-base font-bold text-zinc-900">
              Chỉnh ảnh bìa
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 sm:px-4"
              onClick={onClose}
              disabled={busy}
            >
              Hủy
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-[#fe2c55] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
            >
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Cột trái: rail dọc Sticker/Text + panel (kiểu TikTok) */}
          <aside className="hidden shrink-0 border-r border-zinc-200 bg-zinc-50 sm:flex">
            <nav className="flex w-14 shrink-0 flex-col border-r border-zinc-200 bg-white py-2">
              <button
                type="button"
                className={`mx-1.5 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-2.5 text-[10px] font-semibold transition ${
                  toolTab === 'sticker'
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
                onClick={() => setToolTab('sticker')}
                aria-pressed={toolTab === 'sticker'}
              >
                <IoHappyOutline className="text-xl" aria-hidden />
                Sticker
              </button>
              <button
                type="button"
                className={`mx-1.5 mt-1 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-2.5 text-[10px] font-semibold transition ${
                  toolTab === 'text'
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
                onClick={() => setToolTab('text')}
                aria-pressed={toolTab === 'text'}
              >
                <IoTextOutline className="text-xl" aria-hidden />
                Text
              </button>
            </nav>
            <div className="scrollbar-none flex w-[180px] min-h-0 flex-col overflow-y-auto p-3 xl:w-[200px]">
              {toolTab === 'sticker' ? (
                <div className="grid grid-cols-2 gap-2">
                  {COVER_STICKERS.map((preset) => {
                    const selected = activeSticker?.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title="Thêm sticker lên ảnh bìa"
                        aria-pressed={selected}
                        onClick={() => placeSticker(preset)}
                        className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-zinc-900/90 p-1.5 transition ${
                          selected
                            ? 'border-sky-500 ring-2 ring-sky-400/80'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Thêm chữ lên ảnh bìa sẽ sớm có. Hiện bạn có thể chọn sticker, khung hình hoặc tải ảnh lên.
                </p>
              )}
            </div>
          </aside>

          {/* Cột giữa: canvas ngang + scale + filmstrip */}
          <div className="flex min-w-0 flex-1 flex-col bg-zinc-100">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-3 sm:px-6">
              {!canUseVideoTab && tab === 'video' ? (
                <p className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
                  Không có video để trích khung hình. Hãy dùng nút tải ảnh bìa bên dưới.
                </p>
              ) : stripLoading && tab === 'video' ? (
                <p className="text-sm text-zinc-500">Đang tạo khung hình từ video…</p>
              ) : stripError && tab === 'video' ? (
                <p className="max-w-sm rounded-lg border border-rose-200 bg-rose-50 p-3 text-center text-sm text-rose-700">
                  {stripError}
                </p>
              ) : (
                <div className="relative flex max-h-full w-full max-w-[640px] items-center justify-center">
                  {/* Canvas ngang — guide dọc = vùng crop dọc trên feed */}
                  <div
                    ref={canvasStageRef}
                    className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-lg ring-1 ring-zinc-300"
                    onPointerDown={() => setStickerSelected(false)}
                  >
                    {previewSrc ? (
                      <img
                        key={previewSrc}
                        src={previewSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full object-contain transition-transform duration-100"
                        style={{ transform: `scale(${scale})` }}
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 animate-pulse bg-zinc-800" aria-hidden />
                    )}

                    {activeSticker ? (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Sticker trên ảnh bìa"
                        className={`absolute z-10 touch-none select-none ${
                          stickerSelected ? 'cursor-move' : 'cursor-pointer'
                        }`}
                        style={{
                          left: `${activeSticker.xPct}%`,
                          top: `${activeSticker.yPct}%`,
                          width: `${activeSticker.wPct}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onPointerDown={onStickerPointerDown}
                        onKeyDown={(e) => {
                          if (e.key === 'Delete' || e.key === 'Backspace') {
                            e.preventDefault()
                            setActiveSticker(null)
                          }
                        }}
                      >
                        <div
                          className={`relative ${
                            stickerSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent' : ''
                          }`}
                        >
                          <img
                            src={activeSticker.src}
                            alt=""
                            className="pointer-events-none block h-auto w-full object-contain drop-shadow-md"
                            draggable={false}
                            decoding="async"
                          />
                          {stickerSelected ? (
                            <>
                              <button
                                type="button"
                                aria-label="Xóa sticker"
                                className="absolute -right-2 -top-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white shadow"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveSticker(null)
                                }}
                              >
                                ×
                              </button>
                              <span
                                aria-hidden
                                className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-sky-400 bg-white shadow"
                              />
                              <span
                                aria-hidden
                                className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-sky-400 bg-white shadow"
                              />
                              <span
                                aria-hidden
                                className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-sky-400 bg-white shadow"
                              />
                              <span
                                aria-hidden
                                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-sky-400 bg-white shadow"
                                onPointerDown={onStickerResizePointerDown}
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className="pointer-events-none absolute inset-y-0 left-[18%] w-px bg-white/95"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-[18%] w-px bg-white/95"
                      aria-hidden
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scale */}
            <div className="flex shrink-0 items-center justify-end gap-2 px-4 pb-2 sm:px-6">
              <span className="text-xs font-medium text-zinc-600">Scale</span>
              <button
                type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-500 hover:bg-zinc-200"
                aria-label="Thu nhỏ"
                onClick={() => setScale((s) => Math.max(1, Number((s - 0.05).toFixed(2))))}
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={2}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-1.5 w-28 cursor-pointer accent-[#20d5ec] sm:w-40"
                aria-label="Phóng to ảnh bìa"
              />
              <button
                type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-500 hover:bg-zinc-200"
                aria-label="Phóng to"
                onClick={() => setScale((s) => Math.min(2, Number((s + 0.05).toFixed(2))))}
              >
                +
              </button>
            </div>

            {/* Filmstrip ngang + Upload cover */}
            <div className="flex shrink-0 items-center gap-2 border-t border-zinc-200 bg-white px-2 py-3 sm:gap-3 sm:px-4">
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => onPickImageFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                className={`flex h-14 w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border text-[10px] font-semibold leading-tight transition sm:text-[11px] ${
                  tab === 'upload'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <IoAdd className="text-xl" aria-hidden />
                Tải ảnh bìa
              </button>

              <button
                type="button"
                aria-label="Cuộn dải ảnh sang trái"
                aria-disabled={filmstripAtStart}
                onClick={() => scrollFilmstrip(-1)}
                className={`hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 sm:flex ${
                  filmstripAtStart ? 'cursor-default opacity-40' : ''
                }`}
              >
                <IoChevronBack className="text-lg" aria-hidden />
              </button>

              <div
                ref={filmstripRef}
                role="region"
                aria-label="Dải khung hình"
                tabIndex={0}
                onScroll={syncFilmstripScrollState}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    scrollFilmstrip(-1)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    scrollFilmstrip(1)
                  }
                }}
                className="min-h-14 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-none touch-pan-x"
              >
                <div ref={filmstripTrackRef} className="flex w-max gap-1.5 pr-0.5">
                  {frames.map((f, i) => (
                    <button
                      key={`${f.time}-${i}`}
                      type="button"
                      onClick={() => {
                        setTab('video')
                        setSelectedIdx(i)
                      }}
                      className={`h-14 w-24 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition ${
                        tab === 'video' && selectedIdx === i
                          ? 'border-sky-500 ring-1 ring-sky-400'
                          : 'border-transparent opacity-85 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={f.dataUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="eager"
                        decoding="async"
                        onLoad={syncFilmstripScrollState}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                aria-label="Cuộn dải ảnh sang phải"
                aria-disabled={filmstripAtEnd}
                onClick={() => scrollFilmstrip(1)}
                className={`hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 sm:flex ${
                  filmstripAtEnd ? 'cursor-default opacity-40' : ''
                }`}
              >
                <IoChevronForward className="text-lg" aria-hidden />
              </button>
            </div>

            {error ? (
              <p className="shrink-0 border-t border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                {error}
              </p>
            ) : null}
          </div>

          {/* Cột phải: phone dọc — Preview in profile (4:3) */}
          <aside className="hidden w-[260px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 lg:flex xl:w-[300px]">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-4">
              <div className="flex aspect-9/16 w-[220px] max-h-[min(560px,70vh)] flex-col overflow-hidden rounded-[32px] border border-zinc-300 bg-white shadow-lg ring-1 ring-zinc-200/80">
                {/* Thanh trên điện thoại — asset + fallback CSS */}
                <div className="relative w-full shrink-0 overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold tabular-nums text-zinc-900">
                    <span>8:00</span>
                    <div className="flex items-center gap-1 text-zinc-800" aria-hidden>
                      <div className="flex items-end gap-px pb-0.5">
                        <span className="h-1 w-[3px] rounded-[1px] bg-zinc-700" />
                        <span className="h-1.5 w-[3px] rounded-[1px] bg-zinc-700" />
                        <span className="h-2 w-[3px] rounded-[1px] bg-zinc-700" />
                        <span className="h-2.5 w-[3px] rounded-[1px] bg-zinc-700" />
                      </div>
                      <LuWifi className="text-[13px]" strokeWidth={2.25} />
                      <IoBatteryFullOutline className="text-[15px]" />
                    </div>
                  </div>
                  <img
                    src={COVER_PREVIEW_TOP_PHONE}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-0"
                    onLoad={(e) => {
                      // Chỉ phủ asset nếu ảnh có nội dung thực (không phải tấm đen gần trống)
                      const img = e.currentTarget
                      if (img.naturalWidth > 8 && img.naturalHeight > 4) {
                        img.classList.remove('opacity-0')
                      }
                    }}
                  />
                </div>

                <div className="flex shrink-0 items-center justify-between px-2.5 pb-1 pt-0.5">
                  <IoChevronBack className="text-xl text-zinc-900" aria-hidden />
                  <IoEllipsisHorizontal className="text-lg text-zinc-900" aria-hidden />
                </div>

                <div className="flex shrink-0 flex-col items-center px-3 pb-3">
                  <img
                    src={COVER_PREVIEW_AVATAR}
                    alt=""
                    className="h-[72px] w-[72px] rounded-full bg-sky-100 object-cover"
                  />
                  <p className="mt-2.5 max-w-full truncate px-1 text-center text-[15px] font-bold text-zinc-900">
                    {COVER_PREVIEW_DISPLAY_NAME}
                  </p>
                  <div className="mt-3 flex w-full items-stretch justify-center gap-0 text-center">
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-zinc-900">−</p>
                      <p className="text-[11px] text-zinc-500">Following</p>
                    </div>
                    <div className="w-px self-stretch bg-zinc-200" aria-hidden />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-zinc-900">−</p>
                      <p className="text-[11px] text-zinc-500">Followers</p>
                    </div>
                    <div className="w-px self-stretch bg-zinc-200" aria-hidden />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-zinc-900">−</p>
                      <p className="text-[11px] text-zinc-500">Likes</p>
                    </div>
                  </div>
                </div>

                {/* Lưới video — ô đầu 4:3 là ảnh bìa đang chọn */}
                <div className="mt-auto grid grid-cols-3 gap-px border-t border-zinc-100 bg-zinc-200">
                  <div className="relative aspect-4/3 overflow-hidden bg-zinc-100">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ transform: `scale(${scale})` }}
                      />
                    ) : (
                      <div className="h-full w-full bg-zinc-200" />
                    )}
                    {activeSticker ? (
                      <img
                        src={activeSticker.src}
                        alt=""
                        className="pointer-events-none absolute object-contain drop-shadow"
                        style={{
                          left: `${activeSticker.xPct}%`,
                          top: `${activeSticker.yPct}%`,
                          width: `${activeSticker.wPct}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        draggable={false}
                      />
                    ) : null}
                  </div>
                  <div className="aspect-4/3 bg-zinc-50" />
                  <div className="aspect-4/3 bg-zinc-50" />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-500">
                Preview in profile (4:3)
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
