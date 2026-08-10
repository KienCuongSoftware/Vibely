import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  IoAdd,
  IoArrowBack,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoTextOutline,
} from 'react-icons/io5'
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

/** Stickers: thumbnail = ảnh thật. Đặt lên canvas hiện đúng PNG; double-click để sửa chữ. */
const COVER_STICKERS = [
  {
    id: 'note-white',
    src: '/images/text-preview/4c79db00-268d-48e2-b9fe-7c3b7bc2707d.png',
    defaultText: 'Vibely',
    styleKey: 'noteWhite',
  },
  {
    id: 'badge-dark',
    src: '/images/text-preview/7f474bee-88ce-461c-a347-843cea4145f4.png',
    defaultText: 'Vibely',
    styleKey: 'badgeDark',
  },
  {
    id: 'frame-glitch',
    src: '/images/text-preview/41dd55c0-fe15-47dd-b954-fd9ca564ee68.png',
    defaultText: 'Vibely',
    styleKey: 'frameGlitch',
  },
  {
    id: 'box-cyan',
    src: '/images/text-preview/565d8583-44a3-477d-95e1-25a681de7d89.png',
    defaultText: 'Vibely',
    styleKey: 'boxCyan',
  },
  {
    id: 'pink-glitch',
    src: '/images/text-preview/8105a2c6-de42-4a3b-8dc7-86ba50be90b1.png',
    defaultText: 'Vibely',
    styleKey: 'pinkGlitch',
  },
  {
    id: 'pink-sticker',
    src: '/images/text-preview/a2f22926-b7ce-4170-bd54-0835a000cfb2.png',
    defaultText: 'Vibely',
    styleKey: 'pinkSticker',
  },
  {
    id: 'yellow-outline',
    src: '/images/text-preview/bf540eca-2aa4-4fb2-a0c3-324cf115c51c.png',
    defaultText: 'Vibely',
    styleKey: 'yellowOutline',
  },
  {
    id: 'bubble-teal',
    src: '/images/text-preview/a9ab0427-53f6-4f35-9755-08facadb1286.png',
    defaultText: 'Vibely',
    styleKey: 'bubbleTeal',
  },
  {
    id: 'window-stack',
    src: '/images/text-preview/d3569db3-e6b1-4995-8d64-b2282aecdcab.png',
    defaultText: 'Vibely',
    styleKey: 'windowStack',
  },
  {
    id: 'pill-lavender',
    src: '/images/text-preview/e6bd373d-b3f5-45fb-944d-1fa4d1b07add.png',
    defaultText: 'Vibely',
    styleKey: 'pillLavender',
  },
]

/** Font theo bề rộng sticker (@container), không dùng vw — để preview 4:3 khớp canvas. */
const STICKER_STYLE_UI = {
  noteWhite:
    'inline-flex max-w-full items-center justify-center rounded-md bg-white px-[0.55em] py-[0.35em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-black shadow-[0.12em_0.12em_0_#00f2ea,-0.1em_-0.08em_0_#fe2c55]',
  badgeDark:
    'inline-flex max-w-full items-center justify-center rounded-full border-2 border-white bg-black px-[0.65em] py-[0.35em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-white shadow-[0_-0.08em_0_#00f2ea,0_0.08em_0_#fe2c55]',
  frameGlitch:
    'inline-flex max-w-full items-center justify-center border-[0.12em] border-[#00f2ea] border-r-[#fe2c55] bg-black/80 px-[0.5em] py-[0.3em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-white [text-shadow:0.06em_0_0_#00f2ea,-0.06em_0_0_#fe2c55]',
  boxCyan:
    'inline-flex max-w-full items-center justify-center rounded-sm border-[0.14em] border-[#00c8e0] bg-white px-[0.55em] py-[0.35em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-black',
  pinkGlitch:
    'inline-flex max-w-full items-center justify-center bg-[#ff2d55] px-[0.55em] py-[0.35em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-white shadow-[0.1em_0.1em_0_#fff,-0.08em_-0.08em_0_#000]',
  pinkSticker:
    'inline-flex max-w-full items-center justify-center text-[length:clamp(14px,26cqw,40px)] font-extrabold leading-none text-[#ff2d55] [text-shadow:0.06em_0.06em_0_#fff,-0.06em_-0.06em_0_#fff,0.06em_-0.06em_0_#fff,-0.06em_0.06em_0_#fff,0.1em_0.14em_0_#111]',
  yellowOutline:
    'inline-flex max-w-full rotate-[-6deg] items-center justify-center text-[length:clamp(14px,26cqw,40px)] font-extrabold leading-none text-[#ffe600] [text-shadow:0.08em_0.08em_0_#111,-0.08em_-0.08em_0_#111,0.08em_-0.08em_0_#111,-0.08em_0.08em_0_#111]',
  bubbleTeal:
    'inline-flex max-w-full items-center justify-center rounded-2xl border-[0.18em] border-white bg-[#54b8a0] px-[0.65em] py-[0.4em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-white',
  windowStack:
    'inline-flex max-w-full items-center justify-center rounded-md border-2 border-[#5b6cff] bg-white px-[0.55em] py-[0.4em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-[#3d4fd8] shadow-[0.2em_-0.2em_0_#5b6cff]',
  pillLavender:
    'inline-flex max-w-full items-center justify-center rounded-full bg-[#838cef] px-[0.75em] py-[0.4em] text-[length:clamp(12px,22cqw,36px)] font-extrabold leading-tight text-white',
  plainText:
    'inline-flex max-w-full items-center justify-center text-[length:clamp(14px,26cqw,40px)] font-extrabold leading-tight text-white [text-shadow:0.04em_0.04em_0.08em_rgba(0,0,0,.85)]',
}

const DEFAULT_STICKER_WIDTH_PCT = 42

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không tải được ảnh.'))
    img.src = src
  })
}

/** Vẽ sticker chữ lên canvas export (không cần html2canvas). */
function drawTextStickerOnCanvas(ctx, sticker, canvasW, canvasH) {
  const text = String(sticker.text ?? 'Text').trim() || 'Text'
  const wPct = Math.min(90, Math.max(12, Number(sticker.wPct) || DEFAULT_STICKER_WIDTH_PCT))
  const maxW = (wPct / 100) * canvasW
  const cx = ((Number(sticker.xPct) || 50) / 100) * canvasW
  const cy = ((Number(sticker.yPct) || 50) / 100) * canvasH
  const styleKey = sticker.styleKey || 'bubbleTeal'
  const fontSize = Math.max(18, Math.round(maxW * 0.22))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`

  const padX = fontSize * 0.55
  const padY = fontSize * 0.4
  const metrics = ctx.measureText(text)
  const textW = Math.min(maxW - padX * 2, metrics.width)
  const boxW = Math.min(maxW, textW + padX * 2)
  const boxH = fontSize + padY * 2
  const x0 = cx - boxW / 2
  const y0 = cy - boxH / 2
  const r = Math.min(boxH / 2, fontSize * 0.45)

  const roundRect = (x, y, w, h, radius) => {
    const rr = Math.min(radius, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  }

  switch (styleKey) {
    case 'noteWhite':
      ctx.fillStyle = '#fff'
      roundRect(x0, y0, boxW, boxH, 8)
      ctx.fill()
      ctx.fillStyle = '#000'
      break
    case 'badgeDark':
      ctx.fillStyle = '#000'
      roundRect(x0, y0, boxW, boxH, boxH / 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = Math.max(2, fontSize * 0.08)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      break
    case 'frameGlitch':
      ctx.strokeStyle = '#00f2ea'
      ctx.lineWidth = Math.max(3, fontSize * 0.1)
      ctx.strokeRect(x0, y0, boxW, boxH)
      ctx.fillStyle = '#fff'
      break
    case 'boxCyan':
      ctx.fillStyle = '#fff'
      roundRect(x0, y0, boxW, boxH, 4)
      ctx.fill()
      ctx.strokeStyle = '#00c8e0'
      ctx.lineWidth = Math.max(4, fontSize * 0.12)
      ctx.stroke()
      ctx.fillStyle = '#000'
      break
    case 'pinkGlitch':
      ctx.fillStyle = '#ff2d55'
      ctx.fillRect(x0, y0, boxW, boxH)
      ctx.fillStyle = '#fff'
      break
    case 'pinkSticker':
      ctx.lineWidth = Math.max(4, fontSize * 0.14)
      ctx.strokeStyle = '#fff'
      ctx.strokeText(text, cx, cy)
      ctx.fillStyle = '#ff2d55'
      ctx.fillText(text, cx, cy)
      ctx.restore()
      return
    case 'yellowOutline':
      ctx.translate(cx, cy)
      ctx.rotate((-6 * Math.PI) / 180)
      ctx.lineWidth = Math.max(5, fontSize * 0.16)
      ctx.strokeStyle = '#111'
      ctx.strokeText(text, 0, 0)
      ctx.fillStyle = '#ffe600'
      ctx.fillText(text, 0, 0)
      ctx.restore()
      return
    case 'bubbleTeal':
      ctx.fillStyle = '#54b8a0'
      roundRect(x0, y0, boxW, boxH, 18)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = Math.max(5, fontSize * 0.14)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      break
    case 'windowStack':
      ctx.fillStyle = '#5b6cff'
      ctx.fillRect(x0 + 8, y0 - 8, boxW, boxH)
      ctx.fillStyle = '#fff'
      roundRect(x0, y0, boxW, boxH, 6)
      ctx.fill()
      ctx.strokeStyle = '#5b6cff'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#3d4fd8'
      break
    case 'pillLavender':
      ctx.fillStyle = '#838cef'
      roundRect(x0, y0, boxW, boxH, boxH / 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      break
    default:
      ctx.fillStyle = '#fff'
      break
  }

  ctx.fillText(text, cx, cy)
  ctx.restore()
}

async function compositeCoverWithSticker(baseBlob, sticker) {
  if (!sticker) return baseBlob
  const baseUrl = URL.createObjectURL(baseBlob)
  try {
    const baseImg = await loadHtmlImage(baseUrl)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, baseImg.naturalWidth || baseImg.width)
    canvas.height = Math.max(1, baseImg.naturalHeight || baseImg.height)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)

    const useImage = Boolean(sticker.useImage && sticker.src)
    if (useImage) {
      const stickerImg = await loadHtmlImage(sticker.src)
      const wPct = Math.min(90, Math.max(12, Number(sticker.wPct) || DEFAULT_STICKER_WIDTH_PCT))
      const drawW = (wPct / 100) * canvas.width
      const aspect =
        (stickerImg.naturalHeight || stickerImg.height) /
        Math.max(1, stickerImg.naturalWidth || stickerImg.width)
      const drawH = drawW * aspect
      const cx = ((Number(sticker.xPct) || 50) / 100) * canvas.width
      const cy = ((Number(sticker.yPct) || 50) / 100) * canvas.height
      ctx.drawImage(stickerImg, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
    } else {
      drawTextStickerOnCanvas(ctx, sticker, canvas.width, canvas.height)
    }
    return canvasToJpegBlob(canvas, COVER_EXPORT_JPEG_QUALITY)
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
  /** @type {[null | { id: string, styleKey: string, text: string, xPct: number, yPct: number, wPct: number }, Function]} */
  const [activeSticker, setActiveSticker] = useState(null)
  const [stickerSelected, setStickerSelected] = useState(true)
  const [stickerEditing, setStickerEditing] = useState(false)
  const stickerTextRef = useRef(null)
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
    setStickerEditing(false)
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
    setStickerEditing(false)
    setActiveSticker((prev) => {
      if (prev?.id === preset.id) return prev
      return {
        id: preset.id,
        src: preset.src,
        styleKey: preset.styleKey,
        text: preset.defaultText || 'Vibely',
        useImage: Boolean(preset.src),
        xPct: prev?.xPct ?? 50,
        yPct: prev?.yPct ?? 48,
        wPct: prev?.wPct ?? DEFAULT_STICKER_WIDTH_PCT,
      }
    })
  }, [])

  const placePlainText = useCallback(() => {
    setToolTab('text')
    setStickerSelected(true)
    setStickerEditing(true)
    setActiveSticker({
      id: `text-${Date.now()}`,
      src: '',
      styleKey: 'plainText',
      text: 'Text',
      useImage: false,
      xPct: 50,
      yPct: 48,
      wPct: DEFAULT_STICKER_WIDTH_PCT,
    })
  }, [])

  const beginEditSticker = useCallback(() => {
    setStickerSelected(true)
    setActiveSticker((prev) => (prev ? { ...prev, useImage: false } : prev))
    setStickerEditing(true)
  }, [])

  useEffect(() => {
    if (!stickerEditing) return undefined
    const id = window.setTimeout(() => {
      const el = stickerTextRef.current
      if (!el) return
      if (!el.textContent) el.textContent = activeSticker?.text || 'Text'
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }, 0)
    return () => window.clearTimeout(id)
  }, [stickerEditing, activeSticker?.id])

  const onStickerPointerDown = useCallback((e) => {
    if (!activeSticker || busy || stickerEditing) return
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
  }, [activeSticker, busy, stickerEditing])

  const onStickerResizePointerDown = useCallback((e) => {
    if (!activeSticker || busy || stickerEditing) return
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
  }, [activeSticker, busy, stickerEditing])

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

      if (activeSticker) {
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

  /** Stage: ảnh bìa + sticker (PNG đúng ảnh đã chọn; sửa chữ thì chuyển sang text style). */
  const renderStageLayers = ({ interactive }) => {
    const styleClass =
      STICKER_STYLE_UI[activeSticker?.styleKey] || STICKER_STYLE_UI.bubbleTeal
    const showImage =
      Boolean(activeSticker?.useImage && activeSticker?.src) &&
      !(interactive && stickerEditing)
    return (
      <>
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
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? 'Sticker trên ảnh bìa' : undefined}
            className={`absolute z-10 select-none ${
              interactive
                ? stickerEditing
                  ? 'cursor-text'
                  : stickerSelected
                    ? 'cursor-move'
                    : 'cursor-pointer'
                : 'pointer-events-none'
            } ${interactive && !stickerEditing ? 'touch-none' : ''}`}
            style={{
              left: `${activeSticker.xPct}%`,
              top: `${activeSticker.yPct}%`,
              width: `${activeSticker.wPct}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={interactive && !stickerEditing ? onStickerPointerDown : undefined}
            onDoubleClick={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    beginEditSticker()
                  }
                : undefined
            }
            onKeyDown={
              interactive
                ? (e) => {
                    if (stickerEditing) return
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault()
                      setActiveSticker(null)
                      setStickerEditing(false)
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      beginEditSticker()
                    }
                  }
                : undefined
            }
          >
            <div
              className={`relative w-full ${
                interactive && stickerSelected
                  ? 'ring-2 ring-[#20d5ec] ring-offset-2 ring-offset-transparent'
                  : ''
              }`}
            >
              {showImage ? (
                <img
                  src={activeSticker.src}
                  alt=""
                  className="pointer-events-none block h-auto w-full object-contain drop-shadow-md"
                  draggable={false}
                  decoding="async"
                />
              ) : (
                <div className="@container w-full">
                  <div
                    ref={interactive ? stickerTextRef : undefined}
                    contentEditable={Boolean(interactive && stickerEditing)}
                    suppressContentEditableWarning
                    spellCheck={false}
                    className={`${styleClass} outline-none`}
                    onPointerDown={
                      interactive && stickerEditing
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
                    onInput={
                      interactive
                        ? (e) => {
                            const next = e.currentTarget.textContent ?? ''
                            setActiveSticker((prev) =>
                              prev ? { ...prev, text: next, useImage: false } : prev,
                            )
                          }
                        : undefined
                    }
                    onBlur={
                      interactive
                        ? (e) => {
                            const next = (e.currentTarget.textContent ?? '').trim() || 'Text'
                            e.currentTarget.textContent = next
                            setActiveSticker((prev) =>
                              prev ? { ...prev, text: next, useImage: false } : prev,
                            )
                            setStickerEditing(false)
                          }
                        : undefined
                    }
                    onKeyDown={
                      interactive && stickerEditing
                        ? (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              e.currentTarget.blur()
                            }
                            e.stopPropagation()
                          }
                        : undefined
                    }
                  >
                    {interactive && stickerEditing ? null : activeSticker.text || 'Text'}
                  </div>
                </div>
              )}
              {interactive && stickerSelected && !stickerEditing ? (
                <>
                  <button
                    type="button"
                    aria-label="Xóa sticker"
                    className="absolute -right-2 -top-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white shadow ring-1 ring-white/20"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveSticker(null)
                      setStickerEditing(false)
                    }}
                  >
                    ×
                  </button>
                  <span
                    aria-hidden
                    className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                  />
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#20d5ec] bg-white shadow"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-[#20d5ec] bg-white shadow"
                    onPointerDown={onStickerResizePointerDown}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-modal-title"
    >
      <div className="flex h-[min(920px,96vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-xl bg-[#121212] text-zinc-100 shadow-2xl ring-1 ring-white/10">
        {/* Header kiểu TikTok */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-200 hover:bg-white/10"
              onClick={onClose}
              aria-label="Quay lại"
              disabled={busy}
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <h2 id="cover-modal-title" className="truncate text-base font-bold text-white">
              Chỉnh ảnh bìa
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-50 sm:px-4"
              onClick={onClose}
              disabled={busy}
            >
              Hủy
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-[#fe2c55] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
            >
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Cột trái: rail dọc Sticker/Text + panel (kiểu TikTok) */}
          <aside className="hidden shrink-0 border-r border-white/10 bg-[#1a1a1a] sm:flex">
            <nav className="flex w-14 shrink-0 flex-col border-r border-white/10 bg-[#121212] py-2">
              <button
                type="button"
                className={`mx-1.5 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-2.5 text-[10px] font-semibold transition ${
                  toolTab === 'sticker'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
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
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
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
                        title="Thêm sticker (double-click trên canvas để sửa chữ)"
                        aria-pressed={selected}
                        onClick={() => placeSticker(preset)}
                        className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-black p-1.5 transition ${
                          selected
                            ? 'border-[#20d5ec] ring-2 ring-[#20d5ec]/50'
                            : 'border-white/10 hover:border-white/30'
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
                <div className="flex flex-col gap-3">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Thêm chữ lên ảnh bìa. Double-click chữ trên canvas để sửa nội dung.
                  </p>
                  <button
                    type="button"
                    onClick={placePlainText}
                    className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10"
                  >
                    + Thêm chữ
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Cột giữa: canvas ngang + scale + filmstrip */}
          <div className="flex min-w-0 flex-1 flex-col bg-[#0a0a0a]">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-3 sm:px-6">
              {!canUseVideoTab && tab === 'video' ? (
                <p className="max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                  Không có video để trích khung hình. Hãy dùng nút tải ảnh bìa bên dưới.
                </p>
              ) : stripLoading && tab === 'video' ? (
                <p className="text-sm text-zinc-400">Đang tạo khung hình từ video…</p>
              ) : stripError && tab === 'video' ? (
                <p className="max-w-sm rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-center text-sm text-rose-300">
                  {stripError}
                </p>
              ) : (
                <div className="relative flex max-h-full w-full max-w-[640px] items-center justify-center">
                  {/* Canvas ngang — guide dọc = vùng crop hiện trên preview hồ sơ */}
                  <div
                    ref={canvasStageRef}
                    className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-lg ring-1 ring-white/15"
                    onPointerDown={() => {
                      setStickerSelected(false)
                      setStickerEditing(false)
                    }}
                  >
                    {renderStageLayers({ interactive: true })}

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
              <span className="text-xs font-medium text-zinc-400">Scale</span>
              <button
                type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-400 hover:bg-white/10"
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
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-lg leading-none text-zinc-400 hover:bg-white/10"
                aria-label="Phóng to"
                onClick={() => setScale((s) => Math.min(2, Number((s + 0.05).toFixed(2))))}
              >
                +
              </button>
            </div>

            {/* Filmstrip ngang + Upload cover */}
            <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#121212] px-2 py-3 sm:gap-3 sm:px-4">
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
                    ? 'border-[#20d5ec] bg-[#20d5ec]/10 text-[#20d5ec] ring-1 ring-[#20d5ec]/40'
                    : 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10'
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
                className={`hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 sm:flex ${
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
                          ? 'border-[#20d5ec] ring-1 ring-[#20d5ec]/50'
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
                className={`hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 sm:flex ${
                  filmstripAtEnd ? 'cursor-default opacity-40' : ''
                }`}
              >
                <IoChevronForward className="text-lg" aria-hidden />
              </button>
            </div>

            {error ? (
              <p className="shrink-0 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                {error}
              </p>
            ) : null}
          </div>

          {/* Cột phải: phone dọc — Preview in profile (4:3) */}
          <aside className="hidden w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#1a1a1a] lg:flex xl:w-[300px]">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-4">
              <div className="flex aspect-9/16 w-[220px] max-h-[min(560px,70vh)] flex-col overflow-hidden rounded-[32px] border border-zinc-700 bg-black shadow-lg ring-1 ring-white/10">
                {/* Thanh trên — chỉ dùng asset, không vẽ thêm giờ/pin (tránh đè) */}
                <div className="relative w-full shrink-0 overflow-hidden bg-black">
                  <img
                    src={COVER_PREVIEW_TOP_PHONE}
                    alt=""
                    className="block h-auto w-full object-cover object-top"
                  />
                </div>

                <div className="flex shrink-0 items-center justify-between px-2.5 pb-1 pt-0.5">
                  <IoChevronBack className="text-xl text-white" aria-hidden />
                  <IoEllipsisHorizontal className="text-lg text-white" aria-hidden />
                </div>

                <div className="flex shrink-0 flex-col items-center px-3 pb-3">
                  <img
                    src={COVER_PREVIEW_AVATAR}
                    alt=""
                    className="h-[72px] w-[72px] rounded-full bg-zinc-800 object-cover ring-1 ring-white/10"
                  />
                  <p className="mt-2.5 max-w-full truncate px-1 text-center text-[15px] font-bold text-white">
                    {COVER_PREVIEW_DISPLAY_NAME}
                  </p>
                  <div className="mt-3 flex w-full items-stretch justify-center gap-0 text-center">
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">Following</p>
                    </div>
                    <div className="w-px self-stretch bg-zinc-700" aria-hidden />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">Followers</p>
                    </div>
                    <div className="w-px self-stretch bg-zinc-700" aria-hidden />
                    <div className="min-w-0 flex-1 px-1">
                      <p className="text-[15px] font-semibold text-white">−</p>
                      <p className="text-[11px] text-zinc-400">Likes</p>
                    </div>
                  </div>
                </div>

                {/* Lưới video — ô đầu 4:3 = crop giữa 2 guide của stage (giống TikTok) */}
                <div className="mt-auto grid grid-cols-3 gap-px border-t border-zinc-800 bg-zinc-900">
                  <div className="relative aspect-4/3 overflow-hidden bg-black">
                    {/*
                      Guide ở 18%–82% (rộng 64% stage 16:9).
                      Preview phóng stage lên 100/0.64 ≈ 156.25% bề rộng ô và căn giữa
                      → cùng khung hình + sticker như canvas giữa.
                    */}
                    <div
                      className="absolute left-1/2 top-1/2 aspect-video w-[156.25%] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black"
                      aria-hidden={!previewSrc}
                    >
                      {renderStageLayers({ interactive: false })}
                    </div>
                  </div>
                  <div className="aspect-4/3 bg-zinc-950" />
                  <div className="aspect-4/3 bg-zinc-950" />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-400">
                Preview in profile (4:3)
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
