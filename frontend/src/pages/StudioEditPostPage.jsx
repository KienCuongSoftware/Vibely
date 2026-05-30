import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  IoAddCircleOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoExpandOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoSearchOutline,
  IoShareSocialOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client'
import { CoverPickerModal } from '../components/CoverPickerModal'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'
import { isVideoPublicId, normalizeVideoPublicId } from '../utils/videoPublicId.js'
import { resolveUploadedFileLabel } from '../utils/videoFileLabel.js'

const DESC_MAX = 1000

function formatPreviewTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StudioEditPostPage() {
  const { publicId: publicIdParam } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const coverVideoRef = useRef(null)
  const previewVideoRef = useRef(null)
  const previewFrameRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [coverSourceFile, setCoverSourceFile] = useState(null)
  const [coverFetchHint, setCoverFetchHint] = useState('')

  const [previewTab, setPreviewTab] = useState('feed')
  const [mentionableFriends, setMentionableFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
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

  const [previewCurrentTime, setPreviewCurrentTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const [isPreviewMuted, setIsPreviewMuted] = useState(true)

  const publicId = useMemo(
    () => normalizeVideoPublicId(publicIdParam),
    [publicIdParam],
  )
  const validId = isVideoPublicId(publicId)

  const privacyLabels = {
    everyone: 'Mọi người',
    friends: 'Bạn bè',
    onlyYou: 'Chỉ mình tôi',
  }

  useEffect(() => {
    document.title = 'VibelyStudio | Chỉnh sửa bài đăng'
  }, [])

  useEffect(() => {
    if (!token || !validId) {
      setLoading(false)
      setVideo(null)
      setSavedSnapshot(null)
      if (!validId) setLoadError('Liên kết bài đăng không hợp lệ.')
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    setSavedSnapshot(null)
    apiClient
      .getVideo(publicId, { token })
      .then((v) => {
        if (cancelled || !v) return
        const snapTitle = String(v.title ?? '')
        const snapDesc = String(v.description ?? '')
        const snapThumb = String(v.thumbnailUrl ?? '').trim()
        setSavedSnapshot({
          title: snapTitle,
          description: snapDesc,
          thumbnailUrl: snapThumb,
        })
        setVideo(v)
        setDescription(snapDesc)
        setThumbnailUrl(snapThumb)
      })
      .catch((e) => {
        if (!cancelled) {
          setVideo(null)
          setSavedSnapshot(null)
          setLoadError(e instanceof Error ? e.message : 'Không tải được bài đăng.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, publicId, validId])

  useEffect(() => {
    if (!token || !video) return
    let cancelled = false
    setLoadingFriends(true)
    apiClient
      .getMentionableFriends(token)
      .then((rows) => {
        if (!cancelled) setMentionableFriends(Array.isArray(rows) ? rows : [])
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
  }, [token, video?.id])

  useEffect(() => {
    setPreviewCurrentTime(0)
    setPreviewDuration(0)
  }, [previewTab, video?.videoUrl])

  useEffect(() => {
    const el = previewVideoRef.current
    if (!el) return undefined
    const sync = () => {
      setPreviewCurrentTime(Number(el.currentTime || 0))
      setPreviewDuration(Number(el.duration || 0))
    }
    sync()
    el.addEventListener('timeupdate', sync)
    el.addEventListener('loadedmetadata', sync)
    el.addEventListener('durationchange', sync)
    return () => {
      el.removeEventListener('timeupdate', sync)
      el.removeEventListener('loadedmetadata', sync)
      el.removeEventListener('durationchange', sync)
    }
  }, [previewTab, video?.videoUrl])

  useEffect(() => {
    const onFs = () => {
      const host = previewFrameRef.current
      setIsPreviewFullscreen(Boolean(host && document.fullscreenElement === host))
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const mentionableSet = useMemo(() => {
    return new Set(
      mentionableFriends
        .map((u) => String(u?.username ?? '').trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean),
    )
  }, [mentionableFriends])

  const invalidMentions = useMemo(() => {
    const tags = [...String(description).matchAll(/@([a-zA-Z0-9._]+)/g)]
      .map((m) => String(m[1] ?? '').toLowerCase())
      .filter(Boolean)
    return [...new Set(tags)].filter((name) => !mentionableSet.has(name))
  }, [description, mentionableSet])

  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) return false
    const d = String(description ?? '').trim()
    const th = String(thumbnailUrl ?? '').trim()
    return (
      d !== String(savedSnapshot.description ?? '').trim() ||
      th !== String(savedSnapshot.thumbnailUrl ?? '').trim()
    )
  }, [description, thumbnailUrl, savedSnapshot])

  const highlightTags = useCallback((text) => {
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
  }, [])

  const previewCaption = useMemo(() => String(description ?? '').trim(), [description])

  const postHeaderLabel = useMemo(() => resolveUploadedFileLabel(video), [video])

  const musicLine = useMemo(() => {
    const a = String(video?.audioTitle ?? '').trim()
    if (a) return `♫ ${a}`
    return `♫ nhạc gốc - ${user?.displayName || user?.username || 'Vibely'}`
  }, [video?.audioTitle, user?.displayName, user?.username])

  const avatarSrc =
    user?.avatarUrl && String(user.avatarUrl).trim()
      ? user.avatarUrl
      : '/images/users/default-avatar.jpeg'

  const openCoverModal = async () => {
    setCoverFetchHint('')
    setCoverSourceFile(null)
    if (video?.videoUrl) {
      try {
        const res = await fetch(video.videoUrl, { mode: 'cors' })
        if (!res.ok) throw new Error('HTTP')
        const blob = await res.blob()
        setCoverSourceFile(new File([blob], 'video-source.mp4', { type: blob.type || 'video/mp4' }))
      } catch {
        setCoverFetchHint(
          'Không tải video để chọn khung hình (CORS hoặc mạng). Bạn vẫn có thể tải ảnh bìa từ tab trong hộp thoại.',
        )
      }
    }
    setCoverModalOpen(true)
  }

  const closeCoverModal = () => {
    setCoverModalOpen(false)
    setCoverSourceFile(null)
  }

  const save = async () => {
    if (!token || !validId || !hasUnsavedChanges) return
    const preservedTitle =
      String(video?.title ?? savedSnapshot?.title ?? 'Video').trim() || 'Video'
    if (invalidMentions.length > 0) {
      setStatus('Chỉ được tag bạn bè đã follow lẫn nhau.')
      return
    }
    if (String(description).length > DESC_MAX) {
      setStatus(`Mô tả không quá ${DESC_MAX} ký tự.`)
      return
    }
    setBusy(true)
    setStatus('')
    try {
      await apiClient.updateVideo(
        publicId,
        {
          title: preservedTitle,
          description: String(description ?? '').trim() || null,
          thumbnailUrl: String(thumbnailUrl ?? '').trim() || null,
        },
        token,
      )
      navigate('/vibelystudio/posts', {
        replace: true,
        state: { successMessage: 'Đã cập nhật bài đăng.' },
      })
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Không lưu được thay đổi.')
    } finally {
      setBusy(false)
    }
  }

  const togglePreviewPlayback = () => {
    const el = previewVideoRef.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
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
      /* ignore */
    }
  }

  const togglePreviewMuted = (event) => {
    event.stopPropagation()
    const next = !isPreviewMuted
    setIsPreviewMuted(next)
    if (previewVideoRef.current) previewVideoRef.current.muted = next
  }

  return (
    <StudioLayout active="posts" hidePageHeader>
      <CoverPickerModal
        open={coverModalOpen && Boolean(token)}
        onClose={closeCoverModal}
        videoFile={coverSourceFile}
        token={token}
        onConfirm={(url) => setThumbnailUrl(url)}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/vibelystudio/posts"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:bg-zinc-800"
        >
          ← Bài đăng
        </Link>
        {validId ? (
          <span className="text-xs text-zinc-500">
            Mã <span className="font-mono text-zinc-400">#{publicId}</span>
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6">
          {loading ? (
            <p className="py-16 text-center text-sm text-zinc-500">Đang tải bài đăng…</p>
          ) : loadError ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-12 text-center">
              <p className="text-sm text-amber-400">{loadError}</p>
              <Link
                to="/vibelystudio/posts"
                className="mt-4 inline-block text-sm font-medium text-[#fe2c55] hover:underline"
              >
                Về danh sách bài đăng
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 space-y-6">
                <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-zinc-100">{postHeaderLabel}</p>
                        <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                          Đã đăng
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                        <IoCheckmarkCircle className="text-lg" aria-hidden />
                        Chỉnh sửa nội dung hiển thị (mô tả, ảnh bìa)
                      </p>
                    </div>
                    <Link
                      to="/vibelystudio/upload"
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                    >
                      Tải video mới
                    </Link>
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
                          {String(description).length}/{DESC_MAX}
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
                    {coverFetchHint ? <p className="mb-2 text-xs text-amber-400/90">{coverFetchHint}</p> : null}
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
                          src={video?.videoUrl}
                          muted
                          playsInline
                          className="aspect-9/16 max-h-[280px] w-full object-cover"
                          preload="metadata"
                        />
                      )}
                      <button
                        type="button"
                        className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-xs font-medium text-white backdrop-blur-sm hover:bg-black/80"
                        onClick={() => void openCoverModal()}
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
                      placeholder="Thêm vị trí (chưa lưu server — giao diện giống bước đăng)"
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
                                  name="edit-postTiming"
                                  checked={postTiming === 'now'}
                                  onChange={() => setPostTiming('now')}
                                  className="accent-[#fe2c55]"
                                />
                                Đã đăng
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 opacity-60">
                                <input type="radio" name="edit-postTiming" disabled className="accent-[#fe2c55]" />
                                Lên lịch
                                <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                              </label>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-600">Lên lịch sẽ khả dụng trong bản sau.</p>
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
                            <p className="mt-1 text-[11px] text-zinc-600">
                              Tuỳ chọn riêng tư hiển thị để đồng bộ giao diện; API Vibely hiện chỉ lưu mô tả /
                              ảnh bìa.
                            </p>
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
                      className="cursor-pointer rounded-lg bg-[#fe2c55] px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-700 disabled:saturate-0"
                      onClick={() => void save()}
                      disabled={busy || invalidMentions.length > 0 || !hasUnsavedChanges}
                    >
                      {busy ? 'Đang lưu…' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => navigate('/vibelystudio/posts')}
                      disabled={busy}
                    >
                      Hủy
                    </button>
                    {status ? <p className="text-sm text-amber-400">{status}</p> : null}
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
                        previewTab === id ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      onClick={() => setPreviewTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-[#0f0f11] p-3 shadow-2xl">
                  <div className="mx-auto w-full max-w-[304px] overflow-hidden rounded-[26px] border-2 border-zinc-700 bg-zinc-950">
                    {previewTab === 'feed' && video?.videoUrl ? (
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
                            src={video.videoUrl}
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
                                <p className="mt-1 truncate opacity-80">{musicLine}</p>
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
                                    const el = previewVideoRef.current
                                    if (el) el.currentTime = next
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
                    ) : previewTab === 'profile' && video?.videoUrl ? (
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
                            {user?.displayName ?? 'Người dùng'}
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
                              src={video.videoUrl}
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
                    ) : previewTab === 'web' && video?.videoUrl ? (
                      <div className="relative aspect-video bg-black">
                        <video
                          ref={previewVideoRef}
                          src={video.videoUrl}
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
                    ) : (
                      <div className="flex aspect-9/16 items-center justify-center px-4 text-center text-sm text-zinc-500">
                        Không có video để xem trước
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
