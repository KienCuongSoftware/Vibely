import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IoChevronBack, IoChevronForward, IoClose, IoCloudUploadOutline } from 'react-icons/io5'
import { uploadThumbnailToStorage } from '../api/client'

const FRAME_COUNT = 10
/** Khung nhỏ cho dải cuộn ngang — không dùng làm preview lớn. */
const FILMSTRIP_CAPTURE_WIDTH = 192
/** Preview lớn: tối đa bề ngang này (giữ tỉ lệ gốc, không upscale vượt video). */
const PREVIEW_MAX_WIDTH = 1080

function waitSeeked(video) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
  })
}

async function extractVideoFilmstrip(videoFile, frameCount = FRAME_COUNT) {
  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Không tải được video.'))
  })
  const duration = Math.max(0.08, Number(video.duration) || 1)
  const canvas = document.createElement('canvas')
  const vw = video.videoWidth || 360
  const vh = video.videoHeight || 640
  const aspect = vh / Math.max(1, vw)
  canvas.width = FILMSTRIP_CAPTURE_WIDTH
  canvas.height = Math.max(1, Math.round(FILMSTRIP_CAPTURE_WIDTH * aspect))
  const ctx = canvas.getContext('2d')
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
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    })
  }
  URL.revokeObjectURL(url)
  return frames
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** Preview lớn trong modal — trích theo thời điểm, trả về object URL. */
async function extractPreviewFrame(videoFile, timeSeconds, maxWidth = PREVIEW_MAX_WIDTH) {
  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Không tải được video để xem trước ảnh bìa.'))
  })

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
  ctx.drawImage(video, 0, 0, targetW, targetH)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) resolve(value)
        else reject(new Error('Không tạo được ảnh xem trước.'))
      },
      'image/jpeg',
      0.94,
    )
  })

  URL.revokeObjectURL(url)
  return URL.createObjectURL(blob)
}

async function extractOriginalResolutionFrame(videoFile, timeSeconds) {
  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Không tải được video gốc để trích ảnh bìa.'))
  })

  const duration = Math.max(0.08, Number(video.duration) || 1)
  const t = Math.max(0, Math.min(Number(timeSeconds || 0), duration - 0.04))
  video.currentTime = t
  await waitSeeked(video)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, video.videoWidth || 1080)
  canvas.height = Math.max(1, video.videoHeight || 1920)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) resolve(value)
        else reject(new Error('Không tạo được ảnh bìa chất lượng cao.'))
      },
      'image/jpeg',
      0.98,
    )
  })

  URL.revokeObjectURL(url)
  return blob
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Không đọc được tệp ảnh.'))
    r.readAsDataURL(file)
  })
}

export function CoverPickerModal({
  open,
  onClose,
  videoFile,
  token,
  onConfirm,
}) {
  const [tab, setTab] = useState('video')
  const [frames, setFrames] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [stripLoading, setStripLoading] = useState(false)
  const [stripError, setStripError] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewCacheRef = useRef(new Map())
  const coverImageInputRef = useRef(null)
  const filmstripRef = useRef(null)
  const filmstripTrackRef = useRef(null)
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
    if (!open) return
    setTab('video')
    setSelectedIdx(0)
    setFrames([])
    setStripError('')
    setUploadFile(null)
    setError('')
    setPreviewUrl('')
    setPreviewLoading(false)
    previewCacheRef.current.forEach((cachedUrl) => URL.revokeObjectURL(cachedUrl))
    previewCacheRef.current.clear()
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'video' || !videoFile || !frames.length) {
      setPreviewUrl('')
      setPreviewLoading(false)
      return undefined
    }

    const frame = frames[selectedIdx]
    if (!frame) return undefined

    const cacheKey = String(frame.time)
    const cached = previewCacheRef.current.get(cacheKey)
    if (cached) {
      setPreviewUrl(cached)
      setPreviewLoading(false)
      return undefined
    }

    let cancelled = false
    setPreviewLoading(true)
    extractPreviewFrame(videoFile, frame.time)
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        previewCacheRef.current.set(cacheKey, objectUrl)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl('')
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, tab, videoFile, frames, selectedIdx])

  useEffect(() => {
    if (!open || !videoFile) {
      setFrames([])
      setStripLoading(false)
      return
    }
    let cancelled = false
    setStripLoading(true)
    setStripError('')
    extractVideoFilmstrip(videoFile, FRAME_COUNT)
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
  }, [open, videoFile])

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
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  const handleConfirm = async () => {
    if (!token) {
      setError('Bạn cần đăng nhập.')
      return
    }
    setBusy(true)
    setError('')
    try {
      let blob
      let fname = 'cover.jpg'
      let fallbackDataUrl

      if (tab === 'video') {
        const frame = frames[selectedIdx]
        if (!frame?.dataUrl) {
          setError('Chưa có khung hình từ video. Thử tab tải ảnh lên hoặc tải lại video.')
          return
        }
        // Filmstrip dùng bản nhẹ để chọn nhanh, nhưng lúc xác nhận sẽ trích frame gốc.
        if (videoFile) {
          blob = await extractOriginalResolutionFrame(videoFile, frame.time)
        } else {
          blob = await dataUrlToBlob(frame.dataUrl)
          blob = new Blob([blob], { type: 'image/jpeg' })
        }
        fallbackDataUrl = frame.dataUrl
      } else {
        if (!uploadFile) {
          setError('Hãy chọn ảnh từ máy tính.')
          return
        }
        blob = uploadFile
        fname = uploadFile.name || 'cover.jpg'
        fallbackDataUrl = await fileToDataUrl(uploadFile)
      }

      let url
      try {
        url = await uploadThumbnailToStorage(token, blob, fname)
      } catch {
        url = fallbackDataUrl
      }
      onConfirm(url)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Không lưu được ảnh bìa.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const previewSrc =
    tab === 'video'
      ? previewUrl || frames[selectedIdx]?.dataUrl
      : uploadPreviewUrl || undefined

  const canUseVideoTab = Boolean(videoFile)

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-modal-title"
    >
      <div className="flex max-h-[90vh] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="cover-modal-title" className="text-base font-bold text-white">
            Ảnh bìa
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={onClose}
            aria-label="Đóng"
          >
            <IoClose className="text-2xl" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800 px-2">
          <button
            type="button"
            className={`relative flex-1 py-3 text-sm font-medium transition ${
              tab === 'video' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setTab('video')}
          >
            Chọn từ video
            {tab === 'video' ? (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#fe2c55]" />
            ) : null}
          </button>
          <button
            type="button"
            className={`relative flex-1 py-3 text-sm font-medium transition ${
              tab === 'upload' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setTab('upload')}
          >
            Tải lên từ máy tính
            {tab === 'upload' ? (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#fe2c55]" />
            ) : null}
          </button>
        </div>

        <div className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4">
          {tab === 'video' ? (
            <>
              {!canUseVideoTab ? (
                <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-3 text-sm text-amber-200">
                  Không có tệp video cục bộ để trích khung hình. Hãy dùng tab &quot;Tải lên từ máy
                  tính&quot; hoặc tải lại video trong phiên này.
                </p>
              ) : stripLoading ? (
                <p className="py-12 text-center text-sm text-zinc-400">Đang tạo khung hình từ video…</p>
              ) : stripError ? (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
                  {stripError}
                </p>
              ) : (
                <>
                  <div className="relative mx-auto flex max-w-[280px] justify-center overflow-hidden rounded-xl border-2 border-sky-500/80 bg-black ring-2 ring-sky-500/30">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt=""
                        className="aspect-9/16 w-full object-cover"
                        decoding="async"
                      />
                    ) : null}
                    {previewLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-medium text-zinc-200">
                        Đang tải khung HD…
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    Chọn một khung trong dải hình bên dưới — mũi tên chỉ để cuộn danh sách
                  </p>
                  <div className="mt-3 flex min-w-0 w-full items-center gap-2">
                    <button
                      type="button"
                      aria-label="Cuộn dải ảnh sang trái"
                      aria-disabled={filmstripAtStart}
                      onClick={() => scrollFilmstrip(-1)}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/95 text-zinc-100 shadow-md transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white ${
                        filmstripAtStart ? 'cursor-default opacity-40' : ''
                      }`}
                    >
                      <IoChevronBack className="text-xl" aria-hidden />
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
                      className="min-h-24 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 scrollbar-none touch-pan-x"
                    >
                      <div ref={filmstripTrackRef} className="flex w-max gap-1.5 pr-0.5">
                        {frames.map((f, i) => (
                          <button
                            key={`${f.time}-${i}`}
                            type="button"
                            onClick={() => setSelectedIdx(i)}
                            className={`h-24 w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${
                              selectedIdx === i
                                ? 'border-sky-500 ring-1 ring-sky-400'
                                : 'border-zinc-700 opacity-80 hover:opacity-100'
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
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/95 text-zinc-100 shadow-md transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white ${
                        filmstripAtEnd ? 'cursor-default opacity-40' : ''
                      }`}
                    >
                      <IoChevronForward className="text-xl" aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
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
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPickImageFile(e.dataTransfer?.files?.[0] ?? null)
                }}
                className="flex w-full flex-col items-center rounded-xl border border-dashed border-zinc-600 bg-zinc-950/80 px-4 py-12 text-center transition hover:border-zinc-500"
              >
                <IoCloudUploadOutline className="text-4xl text-zinc-500" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-zinc-200">Kéo và thả tệp vào đây</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Hoặc{' '}
                  <span className="font-medium text-sky-400 underline">chọn tệp</span>
                </p>
                <p className="mt-4 text-xs text-zinc-600">
                  Định dạng hỗ trợ: JPG, JPEG, PNG và WebP.
                </p>
              </button>
              {uploadPreviewUrl ? (
                <div className="mt-4 flex justify-center">
                  <img
                    src={uploadPreviewUrl}
                    alt=""
                    className="max-h-64 max-w-full rounded-lg border border-zinc-700 object-contain"
                  />
                </div>
              ) : null}
            </>
          )}

          {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            onClick={onClose}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#fe2c55] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:opacity-50"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {busy ? 'Đang lưu…' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}
