import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, uploadThumbnailToStorage, uploadToPresignedPutUrl } from '../api/client'
import { CoverPickerModal } from '../components/CoverPickerModal'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'
import {
  IoAddCircleOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoCloudUploadOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoShareSocialOutline,
  IoExpandOutline,
  IoVolumeMuteOutline,
  IoVolumeHighOutline,
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

function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    const cleanup = () => URL.revokeObjectURL(url)
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      resolve({
        duration: Number(v.duration || 0),
        width: v.videoWidth,
        height: v.videoHeight,
      })
      cleanup()
    }
    v.onerror = () => {
      cleanup()
      reject(new Error('Không thể đọc thông tin video.'))
    }
    v.src = url
  })
}

function extractThumbnailBlob(file, atSecond = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false

    const cleanup = () => {
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

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0)
      const seekTo = Math.max(0, Math.min(atSecond, duration > 0 ? duration * 0.3 : atSecond))
      video.currentTime = seekTo
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 720
        canvas.height = video.videoHeight || 1280
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

    video.onerror = () => {
      done(reject, new Error('Không thể đọc video để tạo thumbnail.'))
    }

    video.src = url
  })
}

function formatPreviewTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

  useEffect(() => {
    document.title = 'VibelyStudio | Upload'
  }, [])

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
      const host = previewFrameRef.current
      setIsPreviewFullscreen(Boolean(host && document.fullscreenElement === host))
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
    const host = previewFrameRef.current
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
        <header className="mb-6 flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <span className="text-lg font-bold text-white sm:text-xl">Vibely Studio</span>
          <Link to="/profile" className="shrink-0">
            <img
              src={avatarSrc}
              alt=""
              className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
              referrerPolicy="no-referrer"
            />
          </Link>
        </header>

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
                          className="aspect-9/16 max-h-[280px] w-full object-cover"
                          preload="metadata"
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
                <div className="mb-3 flex gap-1 rounded-lg bg-zinc-900/90 p-1 ring-1 ring-zinc-800">
                  {[
                    ['feed', 'Bảng tin'],
                    ['profile', 'Hồ sơ'],
                    ['web', 'Web'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition ${
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
                            loop
                            className="h-full w-full object-cover"
                            autoPlay
                          />
                          {!isPreviewFullscreen ? (
                            <>
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-150 group-hover/preview:opacity-100" />
                              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3 text-[11px] text-white/95">
                                <span>LIVE</span>
                                <span className="opacity-80">Following</span>
                                <span className="font-bold underline decoration-2 underline-offset-4">
                                  Dành cho bạn
                                </span>
                                <IoSearchOutline className="text-base" />
                              </div>
                              <div className="pointer-events-none absolute bottom-14 left-3 right-14 text-xs text-white drop-shadow-md">
                                <p className="font-bold">@{user?.username ?? 'vibely.user'}</p>
                                {previewCaption ? (
                                  <p className="mt-1 line-clamp-2 opacity-95">{highlightTags(previewCaption)}</p>
                                ) : null}
                                <p className="mt-1 truncate opacity-80">
                                  ♫ nhạc gốc - {user?.displayName ?? 'Vibely'}
                                </p>
                              </div>
                              <div className="pointer-events-none absolute bottom-16 right-2 flex flex-col items-center gap-3 text-white">
                                <img
                                  src={avatarSrc}
                                  alt=""
                                  className="h-9 w-9 rounded-full border border-white/60 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <IoHeartOutline className="text-xl" />
                                <IoChatbubbleEllipsesOutline className="text-xl" />
                                <IoBookmarkOutline className="text-xl" />
                                <IoShareSocialOutline className="text-xl" />
                              </div>
                              <div className="absolute inset-x-3 bottom-9 z-10 opacity-0 transition-opacity duration-150 group-hover/preview:opacity-100">
                                <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-100/85">
                                  <span>{formatPreviewTime(previewCurrentTime)}</span>
                                  <span>{formatPreviewTime(previewDuration)}</span>
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
                                  className="h-0.5 w-full cursor-pointer accent-white"
                                />
                              </div>
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-black/65">
                                <div className="mt-2 flex items-center justify-around text-[10px] text-zinc-300">
                                  <span className="flex items-center gap-1">
                                    <IoHomeOutline className="text-[11px]" /> Home
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoPeopleOutline className="text-[11px]" /> Bạn bè
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoAddCircleOutline className="text-[11px]" /> +
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoMailOutline className="text-[11px]" /> Inbox
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoPersonOutline className="text-[11px]" /> Tôi
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={togglePreviewFullscreen}
                          className={`absolute z-20 rounded bg-black/60 p-1 text-zinc-100 transition-opacity duration-150 hover:bg-black/80 ${
                            isPreviewFullscreen
                              ? 'top-4 right-4 opacity-100'
                              : 'right-3 bottom-11 opacity-0 group-hover/preview:opacity-100'
                          }`}
                          aria-label="Thu/phóng màn hình"
                        >
                          <IoExpandOutline className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={togglePreviewMuted}
                          className={`absolute z-20 rounded bg-black/60 p-1 text-zinc-100 transition-opacity duration-150 hover:bg-black/80 ${
                            isPreviewFullscreen
                              ? 'top-4 right-14 opacity-100'
                              : 'right-11 bottom-11 opacity-0 group-hover/preview:opacity-100'
                          }`}
                          aria-label={isPreviewMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                        >
                          {isPreviewMuted ? (
                            <IoVolumeMuteOutline className="text-sm" />
                          ) : (
                            <IoVolumeHighOutline className="text-sm" />
                          )}
                        </button>
                      </div>
                    ) : previewTab === 'profile' ? (
                      <div className="aspect-9/16 bg-zinc-100 p-3 text-zinc-900">
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span>‹</span>
                          <span>•••</span>
                        </div>
                        <div className="mt-4 flex flex-col items-center">
                          <img
                            src={avatarSrc}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <p className="mt-1 text-xs font-semibold">
                            {user?.displayName ?? 'Người Ổn Bất Tỉnh'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-600">@{user?.username ?? 'vibely.user'}</p>
                          <div className="mt-2 h-3 w-24 rounded bg-zinc-200" />
                          <div className="mt-1 flex gap-1">
                            <div className="h-3 w-10 rounded bg-zinc-200" />
                            <div className="h-3 w-10 rounded bg-zinc-200" />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 border-t border-zinc-300 pt-2">
                          <div className="aspect-3/4 overflow-hidden border-r border-b border-zinc-300 bg-zinc-200">
                            <video
                              src={uploadedVideo.playbackUrl}
                              poster={thumbnailUrl || undefined}
                              muted
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="aspect-3/4 border-r border-b border-zinc-300 bg-zinc-200" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-black">
                        <video
                          ref={previewVideoRef}
                          src={uploadedVideo.playbackUrl}
                          poster={thumbnailUrl || undefined}
                          muted
                          playsInline
                          loop
                          autoPlay
                          className="h-full w-full object-contain"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex flex-col items-center justify-center gap-2 text-white">
                          <span>🟡</span>
                          <span>♥</span>
                          <span>💬</span>
                          <span>🔖</span>
                          <span>↗</span>
                        </div>
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
