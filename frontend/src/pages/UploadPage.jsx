import React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, uploadThumbnailToStorage, uploadToPresignedPutUrl } from '../api/client'
import { CoverPickerModal } from '../components/CoverPickerModal'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'
import { LuHeart, LuLayoutGrid, LuMinimize2, LuRepeat2, LuSmartphone, LuWifi } from 'react-icons/lu'
import {
  IoArrowRedoOutline,
  IoBatteryFullOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoChevronBack,
  IoCloudUploadOutline,
  IoEllipsisHorizontal,
  IoExpandOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoMusicalNotesOutline,
  IoPaperPlaneOutline,
  IoPause,
  IoPeopleOutline,
  IoPersonOutline,
  IoPlay,
  IoRefreshOutline,
  IoSearchOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
} from 'react-icons/io5'

const DESC_MAX = 4000
const OPEN_UPLOAD_PICKER_KEY = 'vibely-studio-open-upload-picker'

function formatFileSize(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatResolutionLabel(width, height) {
  if (!height) return '—'
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440P'
  if (height >= 1080) return '1080P'
  if (height >= 720) return '720P'
  return '540P'
}

function readVideoMetadata(file, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const cleanup = () => {
      URL.revokeObjectURL(url)
      v.removeAttribute('src')
      v.load()
    }
    const done = (fn, arg) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      cleanup()
      fn(arg)
    }
    const watchdog = setTimeout(() => {
      done(reject, new Error('Hết thời gian đọc thông tin video.'))
    }, timeoutMs)
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      done(resolve, {
        duration: Number(v.duration || 0),
        width: v.videoWidth,
        height: v.videoHeight,
      })
    }
    v.onerror = () => {
      done(reject, new Error('Không thể đọc thông tin video.'))
    }
    v.src = url
    v.load()
  })
}

function extractThumbnailBlob(file, atSecond = 1, timeoutMs = 20000) {
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

    const drawAndResolve = () => {
      if (settled) return
      try {
        const w = video.videoWidth || 0
        const h = video.videoHeight || 0
        if (w < 2 || h < 2) {
          done(reject, new Error('Không thể đọc khung hình video (kích thước 0).'))
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          done(reject, new Error('Không thể tạo canvas thumbnail.'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              done(reject, new Error('Không thể tạo ảnh thumbnail.'))
              return
            }
            done(resolve, blob)
          },
          'image/jpeg',
          0.86,
        )
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

/** Preview studio (Bảng tin): hiển thị hh:mm:ss giống TikTok */
function formatStudioPreviewClock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = Math.floor(safe % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function deriveAudioUrlFromVideoUrl(videoUrl) {
  const raw = String(videoUrl ?? '').trim()
  if (!raw) return ''
  const converted = raw
    .replace(/\/uploads\//, '/audios/')
    .replace(/\.(mp4|mov|webm)(\?.*)?$/i, '.mp3$2')
  return converted === raw ? '' : converted
}

export function UploadPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const coverVideoRef = useRef(null)
  const previewVideoRef = useRef(null)
  const previewFrameRef = useRef(null)
  const webPreviewFrameRef = useRef(null)
  const [videoFile, setVideoFile] = useState(null)
  const [uploadedVideo, setUploadedVideo] = useState(null)
  const [description, setDescription] = useState('')
  const [previewTab, setPreviewTab] = useState('feed')
  const [mentionableFriends, setMentionableFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [showMoreSettings, setShowMoreSettings] = useState(false)
  const [postTiming, setPostTiming] = useState('now')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacy, setPrivacy] = useState('everyone')
  const [highQuality, setHighQuality] = useState(true)
  const [allowComment, setAllowComment] = useState(true)
  const [allowReuse, setAllowReuse] = useState(true)
  const [discloseContent, setDiscloseContent] = useState(false)
  const [aiContent, setAiContent] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const [isPreviewMuted, setIsPreviewMuted] = useState(true)
  /** Đồng bộ UI play/pause với thẻ video (autoplay / click có thể thay đổi trạng thái) */
  const [previewUiPlaying, setPreviewUiPlaying] = useState(false)
  /** TikTok-style: ngang / vuông → letterbox trong khung 9:16; dọc → phủ khung */
  const [studioPreviewObjectFit, setStudioPreviewObjectFit] = useState('cover')

  const onStudioPreviewVideoMetadata = useCallback((e) => {
    const el = e.currentTarget
    const w = Number(el.videoWidth || 0)
    const h = Number(el.videoHeight || 0)
    if (w > 0 && h > 0) {
      setStudioPreviewObjectFit(w >= h ? 'contain' : 'cover')
    }
  }, [])

  useEffect(() => {
    document.title = 'VibelyStudio | Upload'
  }, [])

  useEffect(() => {
    setStudioPreviewObjectFit('cover')
  }, [uploadedVideo?.playbackUrl])

  useEffect(() => {
    setPreviewUiPlaying(false)
  }, [uploadedVideo?.playbackUrl, previewTab])

  /** Autoplay preview Bảng tin / Web */
  useLayoutEffect(() => {
    if (
      (previewTab !== 'feed' && previewTab !== 'web') ||
      !uploadedVideo?.playbackUrl ||
      isPreviewFullscreen
    )
      return undefined
    const el = previewVideoRef.current
    if (!el) return undefined
    let cancelled = false
    const tryPlay = () => {
      if (cancelled) return
      void el.play().catch(() => {})
    }
    tryPlay()
    const onReady = () => {
      if (!cancelled) tryPlay()
    }
    el.addEventListener('loadeddata', onReady)
    el.addEventListener('canplay', onReady)
    return () => {
      cancelled = true
      el.removeEventListener('loadeddata', onReady)
      el.removeEventListener('canplay', onReady)
    }
  }, [previewTab, uploadedVideo?.playbackUrl, isPreviewFullscreen, isPreviewMuted])

  const uploadGuides = [
    {
      key: 'size',
      title: 'Kích thước và thời lượng',
      detail: 'Tối đa 30 GB, thời lượng video không quá 60 phút.',
    },
    {
      key: 'format',
      title: 'Định dạng tệp',
      detail: 'Khuyến nghị dùng .mp4. Các định dạng phổ biến khác vẫn được hỗ trợ.',
    },
    {
      key: 'resolution',
      title: 'Độ phân giải',
      detail: 'Nên dùng video chất lượng cao: 1080p, 1440p hoặc 4K.',
    },
    {
      key: 'ratio',
      title: 'Tỷ lệ khung hình',
      detail: 'Khuyến nghị 16:9 cho ngang và 9:16 cho dọc.',
    },
  ]

  const privacyLabels = {
    everyone: 'Mọi người',
    friends: 'Bạn bè',
    onlyYou: 'Chỉ mình tôi',
  }

  useEffect(() => {
    const triggerPick = () => {
      if (busy) return
      fileInputRef.current?.click()
    }
    window.addEventListener('vibely-studio-upload-pick', triggerPick)
    return () => window.removeEventListener('vibely-studio-upload-pick', triggerPick)
  }, [busy])

  useEffect(() => {
    let cancelled = false
    try {
      if (sessionStorage.getItem(OPEN_UPLOAD_PICKER_KEY)) {
        sessionStorage.removeItem(OPEN_UPLOAD_PICKER_KEY)
        requestAnimationFrame(() => {
          if (!cancelled) fileInputRef.current?.click()
        })
      }
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!token || !uploadedVideo) return
    let cancelled = false
    setLoadingFriends(true)
    apiClient
      .getMentionableFriends(token)
      .then((rows) => {
        if (cancelled) return
        setMentionableFriends(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setMentionableFriends([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, uploadedVideo])

  useEffect(() => {
    setPreviewCurrentTime(0)
    setPreviewDuration(0)
  }, [previewTab, uploadedVideo?.playbackUrl])

  useEffect(() => {
    const video = previewVideoRef.current
    if (!video) return undefined

    const sync = () => {
      setPreviewCurrentTime(Number(video.currentTime || 0))
      setPreviewDuration(Number(video.duration || 0))
    }
    sync()
    video.addEventListener('timeupdate', sync)
    video.addEventListener('loadedmetadata', sync)
    video.addEventListener('durationchange', sync)
    return () => {
      video.removeEventListener('timeupdate', sync)
      video.removeEventListener('loadedmetadata', sync)
      video.removeEventListener('durationchange', sync)
    }
  }, [previewTab, uploadedVideo?.playbackUrl])

  useEffect(() => {
    const onFullscreenChange = () => {
      const fs = document.fullscreenElement
      const feedHost = previewFrameRef.current
      const webHost = webPreviewFrameRef.current
      setIsPreviewFullscreen(Boolean(fs && (fs === feedHost || fs === webHost)))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const mentionableSet = useMemo(() => {
    return new Set(
      mentionableFriends
        .map((u) => String(u?.username ?? '').trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean),
    )
  }, [mentionableFriends])

  const invalidMentions = useMemo(() => {
    const tags = [...description.matchAll(/@([a-zA-Z0-9._]+)/g)]
      .map((m) => String(m[1] ?? '').toLowerCase())
      .filter(Boolean)
    return [...new Set(tags)].filter((name) => !mentionableSet.has(name))
  }, [description, mentionableSet])

  const highlightTags = (text) => {
    const source = String(text ?? '')
    if (!source) return null
    const chunks = source.split(/([#@][^\s#@]+)/g)
    return chunks.map((part, idx) => {
      if (/^[#@][^\s#@]+$/.test(part)) {
        return (
          <strong key={`${part}-${idx}`} className="font-extrabold text-zinc-100">
            {part}
          </strong>
        )
      }
      return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
    })
  }

  const handleSelectedFile = async (file) => {
    setVideoFile(file ?? null)
    if (!file) return
    setThumbnailUrl('')

    if (!token) {
      setStatus('Bạn cần đăng nhập trước khi đăng tải.')
      return
    }
    const maxSizeBytes = 30 * 1024 * 1024 * 1024
    if (!(file.type || '').startsWith('video/')) {
      setStatus('Tệp đã chọn không phải video hợp lệ.')
      return
    }
    if (file.size > maxSizeBytes) {
      setStatus('Video vượt quá giới hạn 30 GB.')
      return
    }

    setBusy(true)
    try {
      const inferredTitle = String(file.name ?? 'Video mới')
        .replace(/\.[^/.]+$/, '')
        .trim()
      const meta = await readVideoMetadata(file)
      if (meta.duration > 60 * 60) {
        setStatus('Video vượt quá thời lượng tối đa 60 phút.')
        return
      }

      setStatus('Đang lấy liên kết tải lên…')
      const presign = await apiClient.presignVideoUpload(token, {
        contentType: file.type || 'video/mp4',
        fileName: file.name,
      })

      setStatus('Đang tải video lên kho lưu trữ…')
      await uploadToPresignedPutUrl(presign.uploadUrl, file, presign.contentType)
      const playbackUrl = presign.playbackUrl
      const audioUrl = deriveAudioUrlFromVideoUrl(playbackUrl)
      const audioTitle = `âm thanh gốc - ${user?.displayName || user?.username || 'Vibely'}`
      let autoThumbUrl = ''
      try {
        setStatus('Đang tạo ảnh bìa tự động…')
        const thumbBlob = await extractThumbnailBlob(file, 1)
        autoThumbUrl = await uploadThumbnailToStorage(
          token,
          thumbBlob,
          `${inferredTitle || 'cover'}.jpg`,
        )
      } catch {
        // Không chặn luồng đăng video nếu tạo thumbnail tự động thất bại.
      }

      setUploadedVideo({
        fileName: file.name,
        fileSize: file.size,
        title: inferredTitle || 'Video mới',
        playbackUrl,
        audioUrl,
        audioTitle,
        resolutionLabel: formatResolutionLabel(meta.width, meta.height),
      })
      if (autoThumbUrl) {
        setThumbnailUrl(autoThumbUrl)
      }
      setDescription(inferredTitle || 'Video mới')
      setPreviewTab('feed')
      setStatus('')
    } catch (error) {
      setStatus(error.message ?? 'Đăng tải thất bại.')
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async () => {
    if (busy) return
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'Video Files',
              accept: {
                'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'],
              },
            },
          ],
        })
        const file = await handle.getFile()
        await handleSelectedFile(file)
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    fileInputRef.current?.click()
  }

  const onFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null
    await handleSelectedFile(file)
  }

  const saveVideo = async () => {
    if (!token || !uploadedVideo) return
    if (invalidMentions.length > 0) {
      setStatus('Chỉ được tag bạn bè đã follow lẫn nhau.')
      return
    }
    if (description.length > DESC_MAX) {
      setStatus(`Mô tả không quá ${DESC_MAX} ký tự.`)
      return
    }
    setBusy(true)
    try {
      await apiClient.createVideo(
        {
          title: uploadedVideo.title,
          description: description.trim(),
          videoUrl: uploadedVideo.playbackUrl,
          thumbnailUrl: thumbnailUrl.trim(),
          audioUrl: uploadedVideo.audioUrl,
          audioTitle: uploadedVideo.audioTitle,
        },
        token,
      )
      navigate('/vibelystudio/posts', {
        state: { successMessage: 'Đã đăng video thành công.' },
      })
      return
    } catch (error) {
      setStatus(error.message ?? 'Không thể lưu video.')
    } finally {
      setBusy(false)
    }
  }

  const avatarSrc =
    user?.avatarUrl && String(user.avatarUrl).trim()
      ? user.avatarUrl
      : '/images/users/default-avatar.jpeg'
  const previewCaption = description.trim()
  /** Luôn không có @ đầu (Auth đã chuẩn hoá); @ hiển thị riêng để không bị cắt / lệch RTL */
  const studioPreviewHandle = useMemo(() => {
    return String(user?.username ?? 'vibely.user')
      .trim()
      .replace(/^@/, '')
  }, [user?.username])

  const togglePreviewPlayback = () => {
    const video = previewVideoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  const togglePreviewFullscreen = async (event) => {
    event.stopPropagation()
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    const host =
      previewTab === 'web' ? webPreviewFrameRef.current : previewFrameRef.current
    if (!host?.requestFullscreen) return
    try {
      await host.requestFullscreen()
    } catch {
      // ignore fullscreen errors in unsupported browsers/modes
    }
  }

  const togglePreviewMuted = (event) => {
    event.stopPropagation()
    const next = !isPreviewMuted
    setIsPreviewMuted(next)
    if (previewVideoRef.current) {
      previewVideoRef.current.muted = next
    }
  }

  return (
    <StudioLayout active="upload" hidePageHeader>
      <CoverPickerModal
        open={coverModalOpen && Boolean(uploadedVideo)}
        onClose={() => setCoverModalOpen(false)}
        videoFile={videoFile}
        token={token}
        onConfirm={(url) => setThumbnailUrl(url)}
      />
      <div className="flex min-h-0 flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6">
          {!uploadedVideo ? (
            <>
              <div className="rounded-xl border border-dashed border-zinc-600/80 bg-zinc-950/80 px-4 py-14 text-center sm:px-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                  <IoCloudUploadOutline className="text-3xl" aria-hidden />
                </div>
                <p className="mt-4 text-lg font-semibold text-zinc-100">Chọn video để tải lên</p>
                <p className="mt-1 text-sm text-zinc-500">Hoặc kéo thả video vào khu vực này</p>
                <button
                  type="button"
                  className="mt-6 rounded-lg bg-[#fe2c55] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#e62a4d] disabled:opacity-40"
                  onClick={onPickFile}
                  disabled={busy}
                >
                  Chọn video
                </button>
                {status ? <p className="mt-4 text-sm text-amber-400">{status}</p> : null}
                {videoFile ? (
                  <p className="mt-2 text-xs text-zinc-500">Đã chọn: {videoFile.name}</p>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {uploadGuides.map((item) => (
                  <article
                    key={item.key}
                    className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3"
                  >
                    <h3 className="text-sm font-semibold text-zinc-200">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{item.detail}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 space-y-6">
                <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-zinc-100">{uploadedVideo.fileName}</p>
                        <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                          {uploadedVideo.resolutionLabel}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                        <IoCheckmarkCircle className="text-lg" aria-hidden />
                        Đã tải lên ({formatFileSize(uploadedVideo.fileSize)})
                      </p>
                    </div>
                    <button
                      type="button"
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                      onClick={onPickFile}
                      disabled={busy}
                    >
                      <IoRefreshOutline className="text-lg" aria-hidden />
                      Thay thế
                    </button>
                  </div>
                  <div className="h-1 w-full bg-emerald-600" aria-hidden />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">Chi tiết</h2>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Mô tả</label>
                    <div className="overflow-hidden rounded-xl border border-zinc-700/80 bg-black">
                      <textarea
                        className="min-h-[140px] w-full resize-y border-0 bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                        value={description}
                        maxLength={DESC_MAX}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Thêm mô tả cho video của bạn…"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2">
                        <div className="flex flex-wrap gap-3 text-xs">
                          <button
                            type="button"
                            className="font-medium text-[#fe2c55] hover:underline"
                            onClick={() => setDescription((p) => `${p}#`.trim())}
                          >
                            # Thẻ hashtag
                          </button>
                          <button
                            type="button"
                            className="font-medium text-[#fe2c55] hover:underline"
                            onClick={() => setDescription((p) => `${p}@`.trim())}
                          >
                            @ Nhắc đến
                          </button>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {description.length}/{DESC_MAX}
                        </span>
                      </div>
                    </div>
                    {loadingFriends ? (
                      <p className="mt-2 text-xs text-zinc-500">Đang tải danh sách bạn bè có thể tag…</p>
                    ) : null}
                    {invalidMentions.length > 0 ? (
                      <p className="mt-2 text-xs font-medium text-amber-400">
                        Mention không hợp lệ: {invalidMentions.map((m) => `@${m}`).join(', ')}. Chỉ tag bạn bè đã
                        follow lẫn nhau.
                      </p>
                    ) : null}
                    {mentionableFriends.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mentionableFriends.map((friend) => (
                          <button
                            key={friend.id}
                            type="button"
                            className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800"
                            onClick={() => setDescription((prev) => `${prev} @${friend.username}`.trim())}
                          >
                            @{friend.username}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1">
                      <span className="text-sm font-medium text-zinc-300">Ảnh bìa</span>
                      <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                    </div>
                    <div className="relative inline-block max-w-[200px] overflow-hidden rounded-lg border border-zinc-700 bg-black">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="aspect-9/16 max-h-[280px] w-full object-cover"
                        />
                      ) : (
                        <video
                          ref={coverVideoRef}
                          src={uploadedVideo.playbackUrl}
                          muted
                          playsInline
                          className={`aspect-9/16 max-h-[280px] w-full ${
                            studioPreviewObjectFit === 'contain' ? 'object-contain' : 'object-cover'
                          }`}
                          preload="metadata"
                          onLoadedMetadata={onStudioPreviewVideoMetadata}
                        />
                      )}
                      <button
                        type="button"
                        className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-xs font-medium text-white backdrop-blur-sm hover:bg-black/80"
                        onClick={() => setCoverModalOpen(true)}
                      >
                        Chỉnh sửa ảnh bìa
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1">
                      <span className="text-sm font-medium text-zinc-300">Vị trí</span>
                      <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                    </div>
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="Thêm vị trí"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4">
                    {!showMoreSettings ? (
                      <>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">Thời điểm đăng</p>
                            <div className="mt-2 flex flex-wrap gap-4">
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                                <input
                                  type="radio"
                                  name="postTiming"
                                  checked={postTiming === 'now'}
                                  onChange={() => setPostTiming('now')}
                                  className="accent-[#fe2c55]"
                                />
                                Ngay bây giờ
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                                <input
                                  type="radio"
                                  name="postTiming"
                                  checked={postTiming === 'schedule'}
                                  onChange={() => setPostTiming('schedule')}
                                  className="accent-[#fe2c55]"
                                />
                                Lên lịch
                                <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                              </label>
                            </div>
                          </div>
                          <div className="relative">
                            <p className="text-sm font-semibold text-zinc-200">Ai có thể xem video này</p>
                            <button
                              type="button"
                              onClick={() => setPrivacyOpen((o) => !o)}
                              className="mt-2 flex w-full max-w-md items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-left text-sm text-zinc-100"
                            >
                              {privacyLabels[privacy]}
                              <span className="text-zinc-500">{privacyOpen ? '▲' : '▼'}</span>
                            </button>
                            {privacyOpen ? (
                              <div className="absolute z-10 mt-1 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                                {[
                                  ['everyone', 'Mọi người', null],
                                  ['friends', 'Bạn bè', 'Người theo dõi mà bạn cũng theo dõi'],
                                  ['onlyYou', 'Chỉ mình tôi', null],
                                ].map(([key, label, sub]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-800"
                                    onClick={() => {
                                      setPrivacy(key)
                                      setPrivacyOpen(false)
                                    }}
                                  >
                                    <span>
                                      <span className="block text-zinc-100">{label}</span>
                                      {sub ? (
                                        <span className="mt-0.5 block text-xs text-zinc-500">{sub}</span>
                                      ) : null}
                                    </span>
                                    {privacy === key ? (
                                      <span className="shrink-0 text-[#fe2c55]" aria-hidden>
                                        ✓
                                      </span>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mt-4 flex w-full items-center justify-center gap-1 border-t border-zinc-800 pt-4 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                          onClick={() => setShowMoreSettings(true)}
                        >
                          Xem thêm <span aria-hidden>▼</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-5">
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">Ai có thể xem video này</p>
                            <select
                              value={privacy}
                              onChange={(e) => setPrivacy(e.target.value)}
                              className="mt-2 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
                            >
                              <option value="everyone">Mọi người</option>
                              <option value="friends">Bạn bè</option>
                              <option value="onlyYou">Chỉ mình tôi</option>
                            </select>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">Tải lên chất lượng cao</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Mặc định ở chế độ HD khi bạn đăng từ Web Studio
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={highQuality}
                              onClick={() => setHighQuality((v) => !v)}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${highQuality ? 'bg-sky-600' : 'bg-zinc-600'}`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${highQuality ? 'translate-x-5' : ''}`}
                              />
                            </button>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">Cho phép người dùng:</p>
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={allowComment}
                                onChange={(e) => setAllowComment(e.target.checked)}
                                className="rounded border-zinc-600 accent-[#fe2c55]"
                              />
                              Bình luận
                            </label>
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={allowReuse}
                                onChange={(e) => setAllowReuse(e.target.checked)}
                                className="rounded border-zinc-600 accent-[#fe2c55]"
                              />
                              Sử dụng lại nội dung
                              <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                            </label>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">Tiết lộ nội dung bài đăng</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Cho người khác biết bài đăng này quảng bá cho một thương hiệu, sản phẩm hoặc dịch vụ.
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={discloseContent}
                              onClick={() => setDiscloseContent((v) => !v)}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${discloseContent ? 'bg-[#fe2c55]' : 'bg-zinc-600'}`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${discloseContent ? 'translate-x-5' : ''}`}
                              />
                            </button>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">Nội dung do AI tạo ra</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Thêm nhãn này cho nội dung do AI tạo ra.{' '}
                                <span className="text-[#fe2c55]">Tìm hiểu thêm</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={aiContent}
                              onClick={() => setAiContent((v) => !v)}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${aiContent ? 'bg-[#fe2c55]' : 'bg-zinc-600'}`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${aiContent ? 'translate-x-5' : ''}`}
                              />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mt-4 flex w-full items-center justify-center gap-1 border-t border-zinc-800 pt-4 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                          onClick={() => setShowMoreSettings(false)}
                        >
                          Ẩn bớt <span aria-hidden>▲</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-lg bg-[#fe2c55] px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#e62a4d] disabled:opacity-50"
                      onClick={() => void saveVideo()}
                      disabled={busy || invalidMentions.length > 0}
                    >
                      {busy ? 'Đang đăng…' : 'Đăng'}
                    </button>
                    {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
                  </div>
                </div>
              </div>

              <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[340px]">
                <div className="mb-3 flex items-center gap-1">
                  <div className="flex min-w-0 flex-1 gap-1 rounded-lg bg-zinc-900/90 p-1 ring-1 ring-zinc-800">
                    {[
                      ['feed', 'Bảng tin'],
                      ['profile', 'Hồ sơ'],
                      ['web', 'Web'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition ${
                          previewTab === id
                            ? 'bg-zinc-800 text-white shadow'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        onClick={() => setPreviewTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {previewTab === 'web' ? (
                    <button
                      type="button"
                      onClick={() => setPreviewTab('feed')}
                      className="shrink-0 rounded-md border border-zinc-600 bg-zinc-800 p-2 text-white shadow-sm transition hover:bg-zinc-700"
                      title="Preview trên điện thoại"
                      aria-label="Chuyển sang preview điện thoại"
                    >
                      <LuSmartphone className="text-base" strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#0f0f11] p-3 shadow-2xl">
                  <div className="mx-auto w-full max-w-[304px] overflow-hidden rounded-[26px] border-2 border-zinc-700 bg-zinc-950">
                    {previewTab === 'feed' ? (
                      <div
                        ref={previewFrameRef}
                        className={`group/preview relative bg-black ${
                          isPreviewFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-9/16'
                        }`}
                        onClick={togglePreviewPlayback}
                      >
                        <div
                          className={`relative overflow-hidden ${
                            isPreviewFullscreen
                              ? 'aspect-9/16 w-full max-w-[320px] rounded-[26px] border border-zinc-700'
                              : 'h-full w-full'
                          }`}
                        >
                          <video
                            ref={previewVideoRef}
                            src={uploadedVideo.playbackUrl}
                            poster={thumbnailUrl || undefined}
                            muted={isPreviewMuted}
                            playsInline
                            preload="auto"
                            loop
                            className={`h-full w-full ${
                              studioPreviewObjectFit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                            autoPlay
                            onLoadedMetadata={onStudioPreviewVideoMetadata}
                            onPlay={() => setPreviewUiPlaying(true)}
                            onPause={() => setPreviewUiPlaying(false)}
                            onEnded={() => setPreviewUiPlaying(false)}
                          />
                          {!isPreviewFullscreen ? (
                            <>
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-linear-to-t from-black/75 via-black/20 to-transparent opacity-0 transition-opacity duration-150 group-hover/preview:opacity-100" />
                              {/* Top: LIVE + tabs (giống TikTok) + search */}
                              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-2.5 pt-2.5 text-white">
                                <span
                                  className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded border border-white/30 bg-white/10 px-1 py-0.5 text-[8px] font-extrabold leading-none tracking-wide text-white shadow-sm"
                                  aria-hidden
                                >
                                  LIVE
                                </span>
                                <div className="pointer-events-none absolute left-1/2 top-2.5 flex -translate-x-1/2 items-end gap-7 text-[12px] font-semibold leading-none">
                                  <span className="pb-1.5 text-white/45">Following</span>
                                  <span className="relative pb-1.5 text-white">
                                    For You
                                    <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                  </span>
                                </div>
                                <IoSearchOutline className="mt-0.5 shrink-0 text-lg text-white drop-shadow-sm" aria-hidden />
                              </div>
                              {/* Meta trái — phía trên thanh tab dưới */}
                              <div className="pointer-events-none absolute bottom-[54px] left-3 right-17 z-20 text-[12px] leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                <p
                                  className="flex min-w-0 max-w-full items-baseline gap-0 font-bold"
                                  dir="ltr"
                                >
                                  <span className="shrink-0">@</span>
                                  <span className="min-w-0 flex-1 truncate">{studioPreviewHandle}</span>
                                </p>
                                {previewCaption ? (
                                  <p className="mt-0.5 line-clamp-2 text-[11px] font-normal opacity-95">
                                    {highlightTags(previewCaption)}
                                  </p>
                                ) : null}
                                <p className="mt-1 flex items-center gap-1 truncate text-[11px] opacity-85">
                                  <IoMusicalNotesOutline className="shrink-0 text-sm opacity-90" aria-hidden />
                                  <span className="truncate">
                                    Original sound — {user?.displayName ?? 'Vibely'}
                                  </span>
                                </p>
                              </div>
                              {/* Cột icon phải (TikTok) */}
                              <div className="pointer-events-none absolute bottom-[58px] right-1.5 z-20 flex w-12 flex-col items-center gap-[14px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                                <div className="relative flex flex-col items-center">
                                  <img
                                    src={avatarSrc}
                                    alt=""
                                    className="h-11 w-11 rounded-full border-[1.5px] border-white object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -bottom-1.5 left-1/2 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center rounded-full bg-[#fe2c55] text-[13px] font-bold leading-none text-white shadow-md ring-[2.5px] ring-black">
                                    +
                                  </span>
                                </div>
                                <IoHeartOutline className="h-[26px] w-[26px]" strokeWidth={22} aria-hidden />
                                <IoChatbubbleEllipsesOutline className="h-[25px] w-[25px]" strokeWidth={22} aria-hidden />
                                <IoBookmarkOutline className="h-[24px] w-[24px]" strokeWidth={22} aria-hidden />
                                <IoArrowRedoOutline className="mb-0.5 h-[26px] w-[26px]" strokeWidth={22} aria-hidden />
                                <div
                                  className="mt-0.5 flex h-[34px] w-[34px] shrink-0 animate-[spin_9s_linear_infinite] items-center justify-center rounded-full bg-zinc-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] ring-[1.5px] ring-white/90"
                                  aria-hidden
                                >
                                  <div className="h-[15px] w-[15px] rounded-full border border-dashed border-white/55" />
                                </div>
                              </div>
                              <div
                                className="absolute inset-x-2 bottom-[50px] z-30 opacity-0 transition-opacity duration-150 pointer-events-none group-hover/preview:pointer-events-auto group-hover/preview:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between gap-2 pb-1 text-white">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                                      aria-label={previewUiPlaying ? 'Tạm dừng' : 'Phát'}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        togglePreviewPlayback()
                                      }}
                                    >
                                      {previewUiPlaying ? (
                                        <IoPause className="h-4 w-4" aria-hidden />
                                      ) : (
                                        <IoPlay className="h-4 w-4 pl-0.5" aria-hidden />
                                      )}
                                    </button>
                                    <span className="truncate text-[10px] font-medium tabular-nums tracking-tight text-white/95">
                                      {formatStudioPreviewClock(previewCurrentTime)} /{' '}
                                      {formatStudioPreviewClock(previewDuration)}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                                      aria-label={isPreviewMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        togglePreviewMuted(e)
                                      }}
                                    >
                                      {isPreviewMuted ? (
                                        <IoVolumeMuteOutline className="text-base" aria-hidden />
                                      ) : (
                                        <IoVolumeHighOutline className="text-base" aria-hidden />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                                      aria-label="Toàn màn hình"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void togglePreviewFullscreen(e)
                                      }}
                                    >
                                      <IoExpandOutline className="text-base" aria-hidden />
                                    </button>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(0, previewDuration)}
                                  step={0.1}
                                  value={Math.min(previewCurrentTime, Math.max(0, previewDuration))}
                                  onChange={(e) => {
                                    const next = Number(e.target.value || 0)
                                    const video = previewVideoRef.current
                                    if (video) {
                                      video.currentTime = next
                                    }
                                    setPreviewCurrentTime(next)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="h-1 w-full cursor-pointer accent-white"
                                />
                              </div>
                              {/* Thanh điều hướng dưới (TikTok) */}
                              <nav
                                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[50px] items-end justify-between border-t border-white/6 bg-black px-0.5 pb-1.5 pt-1 text-white"
                                aria-hidden
                              >
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 opacity-95">
                                  <IoHomeOutline className="text-[22px] text-white" />
                                  <span className="text-[9px] font-semibold tracking-tight text-white/90">Home</span>
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 opacity-95">
                                  <IoPeopleOutline className="text-[21px] text-white" />
                                  <span className="text-[9px] font-semibold tracking-tight text-white/90">Friends</span>
                                </div>
                                <div className="flex min-w-0 flex-none flex-col items-center justify-end px-1 pb-0.5">
                                  <div className="flex items-center gap-px">
                                    <span className="h-7 w-[2.5px] shrink-0 rounded-sm bg-[#25f4ee]" />
                                    <div className="flex h-9 w-[46px] items-center justify-center rounded-md border border-white bg-black shadow-inner">
                                      <span className="text-[22px] font-light leading-none text-white">+</span>
                                    </div>
                                    <span className="h-7 w-[2.5px] shrink-0 rounded-sm bg-[#fe2c55]" />
                                  </div>
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 opacity-95">
                                  <IoPaperPlaneOutline className="text-[20px] text-white" />
                                  <span className="text-[9px] font-semibold tracking-tight text-white/90">Inbox</span>
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 opacity-95">
                                  <IoPersonOutline className="text-[21px] text-white" />
                                  <span className="text-[9px] font-semibold tracking-tight text-white/90">Me</span>
                                </div>
                              </nav>
                            </>
                          ) : null}
                        </div>
                        {isPreviewFullscreen ? (
                          <>
                            <button
                              type="button"
                              onClick={togglePreviewFullscreen}
                              className="absolute top-4 right-4 z-20 rounded bg-black/60 p-1 text-zinc-100 opacity-100 transition-opacity duration-150 hover:bg-black/80"
                              aria-label="Thu/phóng màn hình"
                            >
                              <IoExpandOutline className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={togglePreviewMuted}
                              className="absolute top-4 right-14 z-20 rounded bg-black/60 p-1 text-zinc-100 opacity-100 transition-opacity duration-150 hover:bg-black/80"
                              aria-label={isPreviewMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                            >
                              {isPreviewMuted ? (
                                <IoVolumeMuteOutline className="text-sm" />
                              ) : (
                                <IoVolumeHighOutline className="text-sm" />
                              )}
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : previewTab === 'profile' ? (
                      <div className="flex aspect-9/16 min-h-0 flex-col overflow-hidden bg-white text-zinc-900">
                        <div className="flex shrink-0 items-center justify-between px-3 pt-2 pb-0.5 text-[11px] font-semibold tabular-nums text-zinc-900">
                          <span>8:00</span>
                          <div className="flex items-center gap-1.5 text-zinc-800" aria-hidden>
                            <div className="flex items-end gap-px pb-0.5">
                              <span className="h-1 w-[3px] rounded-[1px] bg-zinc-700" />
                              <span className="h-1.5 w-[3px] rounded-[1px] bg-zinc-700" />
                              <span className="h-2 w-[3px] rounded-[1px] bg-zinc-700" />
                              <span className="h-2.5 w-[3px] rounded-[1px] bg-zinc-700" />
                            </div>
                            <LuWifi className="text-[15px] text-zinc-800" strokeWidth={2.25} />
                            <IoBatteryFullOutline className="text-[17px]" />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-between px-2 pb-2 pt-0.5">
                          <IoChevronBack className="text-2xl text-zinc-900" aria-hidden />
                          <IoEllipsisHorizontal className="text-xl text-zinc-900" aria-hidden />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                          <div className="flex shrink-0 flex-col items-center px-4 pb-3">
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-[4.5rem] w-[4.5rem] rounded-full object-cover ring-1 ring-zinc-200/90"
                              referrerPolicy="no-referrer"
                            />
                            <p className="mt-2.5 max-w-full px-1 text-center text-[15px] font-bold leading-snug text-zinc-900">
                              {user?.displayName ?? 'Người Ổn Bất Tỉnh'}
                            </p>
                            <p
                              className="mt-1 flex max-w-full justify-center text-[13px] text-zinc-600"
                              dir="ltr"
                            >
                              <span className="inline-flex min-w-0 max-w-full items-baseline gap-0">
                                <span className="shrink-0">@</span>
                                <span className="min-w-0 truncate">{studioPreviewHandle}</span>
                              </span>
                            </p>
                            <div className="mt-3 h-2.5 w-40 max-w-[85%] rounded-md bg-zinc-200" />
                            <div className="mt-2 flex w-full max-w-[10.5rem] justify-center gap-2">
                              <div className="h-2.5 min-w-0 flex-1 rounded-md bg-zinc-200" />
                              <div className="h-2.5 min-w-0 flex-1 rounded-md bg-zinc-200" />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-end justify-around border-b border-zinc-200 px-2">
                            <div className="flex flex-1 flex-col items-center pb-0.5 pt-1 text-zinc-900">
                              <LuLayoutGrid className="text-[22px]" strokeWidth={2.25} aria-hidden />
                              <span className="mt-1.5 h-[2.5px] w-7 rounded-full bg-zinc-900" aria-hidden />
                            </div>
                            <div className="flex flex-1 flex-col items-center pb-2 pt-1 text-zinc-400">
                              <LuRepeat2 className="text-[22px]" strokeWidth={2.25} aria-hidden />
                            </div>
                            <div className="flex flex-1 flex-col items-center pb-2 pt-1 text-zinc-400">
                              <LuHeart className="text-[22px]" strokeWidth={2.25} aria-hidden />
                            </div>
                          </div>
                          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-px bg-white p-px">
                            <div className="relative min-h-0 overflow-hidden bg-zinc-200">
                              <video
                                src={uploadedVideo.playbackUrl}
                                poster={thumbnailUrl || undefined}
                                muted
                                playsInline
                                loop
                                className="absolute inset-0 h-full w-full object-cover"
                                onLoadedMetadata={onStudioPreviewVideoMetadata}
                              />
                            </div>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div
                                key={i}
                                className="min-h-0 bg-zinc-200"
                                aria-hidden
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={webPreviewFrameRef}
                        className={`group/webpreview relative overflow-hidden bg-black shadow-inner ${
                          isPreviewFullscreen
                            ? 'flex h-full w-full flex-col'
                            : 'aspect-video w-full rounded-xl border border-zinc-600/70'
                        }`}
                        onClick={isPreviewFullscreen ? undefined : togglePreviewPlayback}
                      >
                        <div
                          className={
                            isPreviewFullscreen
                              ? 'flex min-h-0 flex-1 cursor-pointer items-center justify-center bg-black'
                              : 'relative h-full w-full'
                          }
                          onClick={isPreviewFullscreen ? togglePreviewPlayback : undefined}
                        >
                          <video
                            ref={previewVideoRef}
                            src={uploadedVideo.playbackUrl}
                            poster={thumbnailUrl || undefined}
                            muted={isPreviewMuted}
                            playsInline
                            preload="auto"
                            loop
                            autoPlay
                            className={
                              isPreviewFullscreen
                                ? 'max-h-full max-w-full object-contain'
                                : 'h-full w-full object-contain'
                            }
                            onLoadedMetadata={onStudioPreviewVideoMetadata}
                            onPlay={() => setPreviewUiPlaying(true)}
                            onPause={() => setPreviewUiPlaying(false)}
                            onEnded={() => setPreviewUiPlaying(false)}
                            onClick={isPreviewFullscreen ? (e) => e.stopPropagation() : undefined}
                          />
                        </div>
                        {!isPreviewFullscreen ? (
                          <>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-linear-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-12">
                              <button
                                type="button"
                                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                                aria-label={previewUiPlaying ? 'Tạm dừng' : 'Phát'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePreviewPlayback()
                                }}
                              >
                                {previewUiPlaying ? (
                                  <IoPause className="h-4 w-4" aria-hidden />
                                ) : (
                                  <IoPlay className="h-4 w-4 pl-0.5" aria-hidden />
                                )}
                              </button>
                              <div className="pointer-events-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                                  aria-label={isPreviewMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    togglePreviewMuted(e)
                                  }}
                                >
                                  {isPreviewMuted ? (
                                    <IoVolumeMuteOutline className="text-lg" aria-hidden />
                                  ) : (
                                    <IoVolumeHighOutline className="text-lg" aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                                  aria-label="Toàn màn hình"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void togglePreviewFullscreen(e)
                                  }}
                                >
                                  <IoExpandOutline className="text-lg" aria-hidden />
                                </button>
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-y-6 right-2 z-20 flex w-11 flex-col items-center justify-center gap-3.5 rounded-xl border border-white/10 bg-black/40 px-1 py-4 text-white shadow-lg backdrop-blur-[3px]">
                              <div className="relative flex flex-col items-center">
                                <img
                                  src={avatarSrc}
                                  alt=""
                                  className="h-9 w-9 rounded-full border border-white/55 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute -bottom-1 left-1/2 flex h-[15px] w-[15px] -translate-x-1/2 items-center justify-center rounded-full bg-[#fe2c55] text-[10px] font-bold leading-none text-white ring-2 ring-black/80">
                                  +
                                </span>
                              </div>
                              <IoHeartOutline className="text-xl" strokeWidth={22} aria-hidden />
                              <IoChatbubbleEllipsesOutline className="text-xl" strokeWidth={22} aria-hidden />
                              <IoBookmarkOutline className="text-[19px]" strokeWidth={22} aria-hidden />
                              <IoArrowRedoOutline className="text-xl" strokeWidth={22} aria-hidden />
                            </div>
                          </>
                        ) : (
                          <div
                            className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-zinc-950 px-4 py-2.5 text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <button
                                type="button"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                                aria-label={previewUiPlaying ? 'Tạm dừng' : 'Phát'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePreviewPlayback()
                                }}
                              >
                                {previewUiPlaying ? (
                                  <IoPause className="h-4 w-4" aria-hidden />
                                ) : (
                                  <IoPlay className="h-4 w-4 pl-0.5" aria-hidden />
                                )}
                              </button>
                              <span className="min-w-0 truncate text-[11px] font-medium tabular-nums text-zinc-400">
                                {formatStudioPreviewClock(previewCurrentTime)} /{' '}
                                {formatStudioPreviewClock(previewDuration)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                                aria-label={isPreviewMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePreviewMuted(e)
                                }}
                              >
                                {isPreviewMuted ? (
                                  <IoVolumeMuteOutline className="text-lg" aria-hidden />
                                ) : (
                                  <IoVolumeHighOutline className="text-lg" aria-hidden />
                                )}
                              </button>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                                aria-label="Thoát toàn màn hình"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void togglePreviewFullscreen(e)
                                }}
                              >
                                <LuMinimize2 className="text-base" strokeWidth={2.5} aria-hidden />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ['Chỉnh sửa', '✂'],
                      ['Âm thanh', '♪'],
                      ['Chữ', 'Aa'],
                    ].map(([label, sym]) => (
                      <button
                        key={label}
                        type="button"
                        className="flex flex-col items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 py-3 text-[11px] text-zinc-300 hover:bg-zinc-800"
                      >
                        <span className="text-lg">{sym}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </StudioLayout>
  )
}
