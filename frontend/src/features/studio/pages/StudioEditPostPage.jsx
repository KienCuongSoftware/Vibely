import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { apiClient } from '@/shared/api/client'
import { CoverPickerModal } from '@/features/upload/components/CoverPickerModal'
import { CuHashtagSuggestions } from '@/features/upload/components/CuHashtagSuggestions'
import { StudioLayout } from '@/features/studio/components/StudioLayout'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isVideoPublicId, normalizeVideoPublicId } from '@/features/post/utils/videoPublicId.js'
import { resolveUploadedFileLabel } from '@/features/post/utils/videoFileLabel.js'

const DESC_MAX = 1000

function formatPreviewTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StudioEditPostPage() {
  const { t } = useTranslation()
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
  const [banNoticeOpen, setBanNoticeOpen] = useState(false)
  const [banNoticeReason, setBanNoticeReason] = useState('')

  const [previewTab, setPreviewTab] = useState('feed')
  const [mentionableFriends, setMentionableFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const descriptionWrapRef = useRef(null)
  const descriptionTextareaRef = useRef(null)
  const mentionDropdownRef = useRef(null)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [loadingMentionSuggestions, setLoadingMentionSuggestions] = useState(false)
  const [mentionAtCaret, setMentionAtCaret] = useState(null) // { query, replaceStart, replaceEnd }
  const [mentionDropdownPos, setMentionDropdownPos] = useState({ top: 0, left: 0 })
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
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
  const [modStatus, setModStatus] = useState(null)
  const [modAppealText, setModAppealText] = useState('')
  const [modAppealBusy, setModAppealBusy] = useState(false)
  const [modAppealMsg, setModAppealMsg] = useState('')

  const publicId = useMemo(
    () => normalizeVideoPublicId(publicIdParam),
    [publicIdParam],
  )
  const validId = isVideoPublicId(publicId)

  const privacyLabels = {
    everyone: t('studio.privacy.everyone'),
    friends: t('studio.privacy.friends'),
    onlyYou: t('studio.privacy.onlyYou'),
  }

  useEffect(() => {
    document.title = t('studio.docTitle.editPost')
  }, [t])

  useEffect(() => {
    if (!token || !validId) {
      setLoading(false)
      setVideo(null)
      setSavedSnapshot(null)
      if (!validId) setLoadError(t('studio.editPost.invalidLink'))
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
        const rawPrivacy = String(v.privacy || 'PUBLIC').toUpperCase()
        const snapPrivacy =
          rawPrivacy === 'FRIENDS' ? 'friends' : rawPrivacy === 'PRIVATE' ? 'onlyYou' : 'everyone'
        setSavedSnapshot({
          title: snapTitle,
          description: snapDesc,
          thumbnailUrl: snapThumb,
          privacy: snapPrivacy,
        })
        setVideo(v)
        setDescription(snapDesc)
        setThumbnailUrl(snapThumb)
        setPrivacy(snapPrivacy)
      })
      .catch((e) => {
        if (!cancelled) {
          setVideo(null)
          setSavedSnapshot(null)
          setLoadError(e instanceof Error ? e.message : t('studio.editPost.loadFailed'))
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
    if (!token || !validId) {
      setModStatus(null)
      return
    }
    let cancelled = false
    apiClient
      .getVideoModerationStatus(token, publicId)
      .then((data) => {
        if (!cancelled) setModStatus(data)
      })
      .catch(() => {
        if (!cancelled) setModStatus(null)
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function getCaretClientRect(textareaEl, position) {
    const value = String(textareaEl?.value ?? '')
    const pos = Math.max(0, Math.min(position, value.length))

    const rect = textareaEl.getBoundingClientRect()
    const style = window.getComputedStyle(textareaEl)

    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    div.style.top = `${rect.top + window.scrollY}px`
    div.style.left = `${rect.left + window.scrollX}px`
    div.style.width = `${rect.width}px`

    // Copy key font/layout styles so caret measurement matches textarea.
    div.style.fontFamily = style.fontFamily
    div.style.fontSize = style.fontSize
    div.style.fontWeight = style.fontWeight
    div.style.fontStyle = style.fontStyle
    div.style.letterSpacing = style.letterSpacing
    div.style.lineHeight = style.lineHeight
    div.style.paddingTop = style.paddingTop
    div.style.paddingRight = style.paddingRight
    div.style.paddingBottom = style.paddingBottom
    div.style.paddingLeft = style.paddingLeft
    div.style.borderTopWidth = style.borderTopWidth
    div.style.borderRightWidth = style.borderRightWidth
    div.style.borderBottomWidth = style.borderBottomWidth
    div.style.borderLeftWidth = style.borderLeftWidth
    div.style.boxSizing = style.boxSizing

    div.style.overflow = 'auto'
    div.scrollTop = textareaEl.scrollTop
    div.scrollLeft = textareaEl.scrollLeft

    const before = escapeHtml(value.substring(0, pos))
    const after = escapeHtml(value.substring(pos))
    div.innerHTML = `${before}<span id="caret-marker" style="display:inline-block;width:1px;background:transparent;">|</span>${after}`

    document.body.appendChild(div)
    const marker = div.querySelector('#caret-marker')
    const markerRect = marker?.getBoundingClientRect()
    document.body.removeChild(div)

    if (!markerRect) return { top: rect.bottom, left: rect.left }
    return { top: markerRect.bottom, left: markerRect.left }
  }

  const updateMentionAtCaret = useCallback(
    (textareaEl, nextValue) => {
      if (!textareaEl) return
      const value = String(nextValue ?? '')
      const caretPos = Number(textareaEl.selectionStart ?? value.length)
      const before = value.slice(0, caretPos)
      const match = before.match(/(?:^|\s)@([a-zA-Z0-9._]*)$/)

      if (!match) {
        setMentionAtCaret(null)
        setMentionSuggestions([])
        setLoadingMentionSuggestions(false)
        return
      }

      const query = String(match[1] ?? '')
      const replaceStart = caretPos - query.length - 1 // the '@'
      const replaceEnd = caretPos

      try {
        const wrapEl = descriptionWrapRef.current
        const wrapRect = wrapEl?.getBoundingClientRect?.()
        const caretRect = getCaretClientRect(textareaEl, caretPos)
        if (wrapRect) {
          setMentionDropdownPos({
            top: caretRect.top - wrapRect.top + 6,
            left: caretRect.left - wrapRect.left,
          })
        }
      } catch {
        // ignore caret coordinate errors
      }

      setActiveMentionIndex(0)
      setMentionAtCaret({ query, replaceStart, replaceEnd })
    },
    [setActiveMentionIndex],
  )

  const updateMentionDropdownPosition = useCallback(() => {
    if (!mentionAtCaret) return
    const ta = descriptionTextareaRef.current
    const wrapEl = descriptionWrapRef.current
    if (!ta || !wrapEl) return
    const wrapRect = wrapEl.getBoundingClientRect()
    const caretPos = Number(ta.selectionStart ?? 0)
    const caretRect = getCaretClientRect(ta, caretPos)
    setMentionDropdownPos({
      top: caretRect.top - wrapRect.top + 6,
      left: caretRect.left - wrapRect.left,
    })
  }, [mentionAtCaret])

  useEffect(() => {
    const ta = descriptionTextareaRef.current
    if (!ta) return undefined
    const onMove = () => updateMentionDropdownPosition()
    ta.addEventListener('scroll', onMove)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, { passive: true })
    return () => {
      ta.removeEventListener('scroll', onMove)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove)
    }
  }, [updateMentionDropdownPosition])

  useEffect(() => {
    if (mentionAtCaret == null) return
    const onDocMouseDown = (e) => {
      const ta = descriptionTextareaRef.current
      const dd = mentionDropdownRef.current
      const target = e.target
      if (ta?.contains?.(target)) return
      if (dd?.contains?.(target)) return
      setMentionAtCaret(null)
      setMentionSuggestions([])
      setLoadingMentionSuggestions(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [mentionAtCaret])

  useEffect(() => {
    if (!token || mentionAtCaret == null) {
      setMentionSuggestions([])
      setLoadingMentionSuggestions(false)
      return
    }

    const q = String(mentionAtCaret.query ?? '')
    if (q.length === 0) {
      setMentionSuggestions(mentionableFriends)
      setLoadingMentionSuggestions(false)
      return
    }

    let cancelled = false
    setLoadingMentionSuggestions(true)
    apiClient
      .getSearchUsers(q, { limit: 8 })
      .then((rows) => {
        if (cancelled) return
        const followedSorted = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => {
          const aKey = String(a?.username ?? '').trim().toLowerCase()
          const bKey = String(b?.username ?? '').trim().toLowerCase()
          const aFollowed = mentionableSet.has(aKey)
          const bFollowed = mentionableSet.has(bKey)
          if (aFollowed !== bFollowed) return aFollowed ? -1 : 1
          return 0
        })
        setMentionSuggestions(followedSorted)
      })
      .catch(() => {
        if (!cancelled) setMentionSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMentionSuggestions(false)
      })

    return () => {
      cancelled = true
    }
  }, [mentionAtCaret, mentionableFriends, mentionableSet, token])

  const replaceMentionAtCaret = useCallback(
    (username) => {
      if (!mentionAtCaret) return
      const clean = String(username ?? '').trim().replace(/^@/, '')
      if (!clean) return

      setDescription((prev) => {
        const source = String(prev ?? '')
        const start = mentionAtCaret.replaceStart
        const end = mentionAtCaret.replaceEnd
        return `${source.slice(0, start)}@${clean} ${source.slice(end)}`
      })

      setMentionAtCaret(null)
      setMentionSuggestions([])
      setLoadingMentionSuggestions(false)

      requestAnimationFrame(() => {
        const ta = descriptionTextareaRef.current
        if (!ta) return
        const caretPos = mentionAtCaret.replaceStart + clean.length + 2
        ta.focus()
        ta.setSelectionRange(caretPos, caretPos)
      })
    },
    [mentionAtCaret],
  )

  const insertAtCaret = useCallback(
    (text) => {
      const ta = descriptionTextareaRef.current
      if (!ta) return
      const pos = Number(ta.selectionStart ?? description.length)
      const source = String(description ?? '')
      const next = `${source.slice(0, pos)}${text}${source.slice(pos)}`
      setDescription(next)
      requestAnimationFrame(() => {
        ta.focus()
        const caretPos = pos + String(text ?? '').length
        ta.setSelectionRange(caretPos, caretPos)
        updateMentionAtCaret(ta, next)
      })
    },
    [description, updateMentionAtCaret],
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) return false
    const d = String(description ?? '').trim()
    const th = String(thumbnailUrl ?? '').trim()
    return (
      d !== String(savedSnapshot.description ?? '').trim() ||
      th !== String(savedSnapshot.thumbnailUrl ?? '').trim() ||
      privacy !== String(savedSnapshot.privacy ?? 'everyone')
    )
  }, [description, thumbnailUrl, privacy, savedSnapshot])

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
    return t('studio.editPost.originalSound', { name: user?.displayName || user?.username || 'Vibely' })
  }, [video?.audioTitle, user?.displayName, user?.username])

  const avatarSrc =
    user?.avatarUrl && String(user.avatarUrl).trim()
      ? user.avatarUrl
      : '/images/users/default-avatar.jpeg'

  const openCoverModal = () => {
    setCoverModalOpen(true)
  }

  const closeCoverModal = () => {
    setCoverModalOpen(false)
  }

  const save = async () => {
    if (!token || !validId || !hasUnsavedChanges) return
    const preservedTitle =
      String(video?.title ?? savedSnapshot?.title ?? 'Video').trim() || 'Video'
    if (String(description).length > DESC_MAX) {
      setStatus(t('studio.editPost.descTooLong', { max: DESC_MAX }))
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
          privacy,
        },
        token,
      )
      navigate('/vibelystudio/posts', {
        replace: true,
        state: { successMessage: t('studio.editPost.updated') },
      })
    } catch (e) {
      if (e?.code === 'ACCOUNT_BANNED') {
        const reason = String(e?.data?.reason ?? '').trim()
        setBanNoticeReason(reason || t('studio.editPost.communityPolicy'))
        setBanNoticeOpen(true)
        setStatus('')
        return
      }
      setStatus(e instanceof Error ? e.message : t('studio.editPost.saveFailed'))
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
        open={coverModalOpen}
        onClose={closeCoverModal}
        videoUrl={video?.videoUrl}
        token={token}
        profileDisplayName={user?.displayName || user?.username}
        profileAvatarUrl={user?.avatarUrl}
        onConfirm={(url) => setThumbnailUrl(url)}
      />
      {banNoticeOpen ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-edit-ban-title"
            className="w-full max-w-[340px] overflow-hidden rounded-sm border border-zinc-800 bg-[#121212] text-center shadow-2xl"
          >
            <div className="px-6 py-6">
              <h2 id="studio-edit-ban-title" className="text-xl font-bold text-zinc-100">
                {t('studio.editPost.bannedTitle')}
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-300">
                {t('studio.editPost.bannedBecause')}{' '}
                <span className="font-semibold text-zinc-100">{banNoticeReason}</span>.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
                {t('studio.editPost.bannedAppealHint')}
              </p>
            </div>
            <div className="border-t border-zinc-800">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center text-[15px] font-semibold text-white transition hover:bg-zinc-900"
                onClick={() => {
                  setBanNoticeOpen(false)
                  navigate('/login', { replace: true })
                }}
              >
                {t('studio.editPost.gotIt')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/vibelystudio/posts"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:bg-zinc-800"
        >
          {t('studio.editPost.backPosts')}
        </Link>
        {validId ? (
          <span className="text-xs text-zinc-500">
            {t('studio.editPost.code')} <span className="font-mono text-zinc-400">#{publicId}</span>
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6">
          {loading ? (
            <p className="py-16 text-center text-sm text-zinc-500">{t('studio.editPost.loading')}</p>
          ) : loadError ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-12 text-center">
              <p className="text-sm text-amber-400">{loadError}</p>
              <Link
                to="/vibelystudio/posts"
                className="mt-4 inline-block text-sm font-medium text-[#fe2c55] hover:underline"
              >
                {t('studio.editPost.backToList')}
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
                          {t('studio.editPost.published')}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                        <IoCheckmarkCircle className="text-lg" aria-hidden />
                        {t('studio.editPost.editVisibleContent')}
                      </p>
                    </div>
                    <Link
                      to="/vibelystudio/upload"
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                    >
                      {t('studio.editPost.uploadNewVideo')}
                    </Link>
                  </div>
                  <div className="h-1 w-full bg-emerald-600" aria-hidden />
                </div>

                {modStatus && modStatus.statusLabel && modStatus.statusLabel !== 'NONE' ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">{t('studio.editPost.moderationTitle')}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{modStatus.messageVi}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {t('studio.editPost.status')}{' '}
                      <span className="text-zinc-300">
                        {modStatus.statusLabel === 'NORMAL'
                          ? t('studio.editPost.statusNormal')
                          : modStatus.statusLabel === 'LIMITED'
                            ? t('studio.editPost.statusLimited')
                            : modStatus.statusLabel === 'UNDER_REVIEW'
                              ? t('studio.editPost.statusReviewing')
                              : modStatus.statusLabel === 'REMOVED'
                                ? t('studio.editPost.statusRemoved')
                                : modStatus.statusLabel}
                      </span>
                      {modStatus.trustScore != null ? (
                        <>
                          {' '}
                          {t('studio.editPost.trustScore', { score: Number(modStatus.trustScore).toFixed(2) })}
                        </>
                      ) : null}
                    </p>
                    {modStatus.hasOpenAppeal ? (
                      <p className="mt-2 text-xs text-amber-300">
                        {t('studio.editPost.appealPending', { state: modStatus.appealState })}
                      </p>
                    ) : null}
                    {modStatus.appealable ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={modAppealText}
                          onChange={(e) => setModAppealText(e.target.value)}
                          rows={3}
                          placeholder={t('studio.editPost.appealPlaceholder')}
                          className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                        />
                        {modAppealMsg ? (
                          <p className="text-xs text-zinc-400">{modAppealMsg}</p>
                        ) : null}
                        <button
                          type="button"
                          disabled={modAppealBusy || modAppealText.trim().length < 10}
                          onClick={async () => {
                            setModAppealBusy(true)
                            setModAppealMsg('')
                            try {
                              await apiClient.createVideoModerationAppeal(token, publicId, {
                                appealText: modAppealText.trim(),
                              })
                              setModAppealMsg(t('studio.editPost.appealSent'))
                              setModAppealText('')
                              const next = await apiClient.getVideoModerationStatus(token, publicId)
                              setModStatus(next)
                            } catch (e) {
                              setModAppealMsg(e.message ?? t('studio.editPost.appealFailed'))
                            } finally {
                              setModAppealBusy(false)
                            }
                          }}
                          className="rounded-lg bg-[#fe2c55] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {modAppealBusy ? t('studio.editPost.sending') : t('studio.editPost.sendAppeal')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <h2 className="text-xl font-bold text-white">{t('studio.editPost.details')}</h2>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-300">{t('studio.editPost.description')}</label>
                    <div
                      ref={descriptionWrapRef}
                      className="relative overflow-visible rounded-xl border border-zinc-700/80 bg-black"
                    >
                      <textarea
                        ref={descriptionTextareaRef}
                        className="min-h-[140px] w-full resize-y border-0 bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                        value={description}
                        maxLength={DESC_MAX}
                        onChange={(e) => {
                          const next = e.target.value
                          setDescription(next)
                          updateMentionAtCaret(e.target, next)
                        }}
                        onKeyUp={(e) => updateMentionAtCaret(e.currentTarget, e.currentTarget.value)}
                        onClick={(e) => updateMentionAtCaret(e.currentTarget, e.currentTarget.value)}
                        onSelect={(e) => updateMentionAtCaret(e.currentTarget, e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (!mentionAtCaret) return
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setMentionAtCaret(null)
                            setMentionSuggestions([])
                            setLoadingMentionSuggestions(false)
                            return
                          }
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            if (!mentionSuggestions.length) return
                            setActiveMentionIndex((idx) => (idx + 1) % mentionSuggestions.length)
                            return
                          }
                          if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            if (!mentionSuggestions.length) return
                            setActiveMentionIndex(
                              (idx) => (idx - 1 + mentionSuggestions.length) % mentionSuggestions.length,
                            )
                            return
                          }
                          if (e.key === 'Enter') {
                            if (!mentionSuggestions.length) return
                            e.preventDefault()
                            const picked = mentionSuggestions[activeMentionIndex]
                            if (picked?.username) replaceMentionAtCaret(picked.username)
                          }
                        }}
                        placeholder={t('studio.editPost.descriptionPlaceholder')}
                      />

                      {mentionAtCaret != null ? (
                        <div
                          ref={mentionDropdownRef}
                          className="absolute z-50 w-[280px] rounded-xl border border-zinc-700 bg-zinc-950/95 p-1 shadow-lg"
                          style={{
                            top: mentionDropdownPos.top,
                            left: mentionDropdownPos.left,
                          }}
                        >
                          {mentionAtCaret.query.length === 0 && loadingFriends ? (
                            <div className="px-3 py-2 text-xs text-zinc-400">{t('studio.editPost.loadingFriends')}</div>
                          ) : loadingMentionSuggestions ? (
                            <div className="px-3 py-2 text-xs text-zinc-400">{t('studio.editPost.searchingUsers')}</div>
                          ) : mentionSuggestions.length > 0 ? (
                            <div className="max-h-[240px] overflow-auto">
                              {mentionSuggestions.map((friend, idx) => {
                                const username = String(friend?.username ?? '').trim()
                                if (!username) return null
                                const active = idx === activeMentionIndex
                                return (
                                  <button
                                    key={friend.id ?? username}
                                    type="button"
                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                                      active ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                                    }`}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      replaceMentionAtCaret(username)
                                    }}
                                  >
                                    <span className="truncate">@{username}</span>
                                    {mentionableSet.has(username.toLowerCase()) ? (
                                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                                        Follow
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-400">{t('studio.editPost.noResults')}</div>
                          )}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2">
                        <div className="flex flex-wrap gap-3 text-xs">
                          <button
                            type="button"
                            className="font-medium text-[#fe2c55] hover:underline"
                            onClick={() => setDescription((p) => `${p}#`.trim())}
                          >
                            {t('studio.editPost.hashtags')}
                          </button>
                          <button
                            type="button"
                            className="font-medium text-[#fe2c55] hover:underline"
                            onClick={() => insertAtCaret('@')}
                          >
                            {t('studio.editPost.mentions')}
                          </button>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {String(description).length}/{DESC_MAX}
                        </span>
                      </div>
                    </div>
                    {loadingFriends ? (
                      <p className="mt-2 text-xs text-zinc-500">{t('studio.editPost.loadingTaggable')}</p>
                    ) : null}
                    <CuHashtagSuggestions
                      publicId={publicId}
                      token={token}
                      description={description}
                      onAppend={(hashtag) => {
                        setDescription((prev) => {
                          const base = String(prev ?? '')
                          const needsSpace = base.length > 0 && !/\s$/.test(base)
                          return `${base}${needsSpace ? ' ' : ''}${hashtag}`
                        })
                      }}
                    />
                    {mentionAtCaret == null ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        {t('studio.editPost.mentionHint')}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1">
                      <span className="text-sm font-medium text-zinc-300">{t('studio.editPost.cover')}</span>
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
                        onClick={openCoverModal}
                      >
                        {t('studio.editPost.editCover')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center gap-1">
                      <span className="text-sm font-medium text-zinc-300">{t('studio.editPost.location')}</span>
                      <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                    </div>
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder={t('studio.editPost.locationPlaceholder')}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4">
                    {!showMoreSettings ? (
                      <>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.postTiming')}</p>
                            <div className="mt-2 flex flex-wrap gap-4">
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                                <input
                                  type="radio"
                                  name="edit-postTiming"
                                  checked={postTiming === 'now'}
                                  onChange={() => setPostTiming('now')}
                                  className="accent-[#fe2c55]"
                                />
                                {t('studio.editPost.published')}
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 opacity-60">
                                <input type="radio" name="edit-postTiming" disabled className="accent-[#fe2c55]" />
                                {t('studio.editPost.schedule')}
                                <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                              </label>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-600">{t('studio.editPost.scheduleSoon')}</p>
                          </div>
                          <div className="relative">
                            <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.whoCanWatch')}</p>
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
                                  ['everyone', t('studio.editPost.everyone'), null],
                                  ['friends', t('studio.editPost.friends'), t('studio.editPost.friendsHint')],
                                  ['onlyYou', t('studio.editPost.onlyYou'), null],
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
                              {t('studio.editPost.privacyHint')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mt-4 flex w-full items-center justify-center gap-1 border-t border-zinc-800 pt-4 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                          onClick={() => setShowMoreSettings(true)}
                        >
                          {t('studio.editPost.seeMore')} <span aria-hidden>▼</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-5">
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.whoCanWatch')}</p>
                            <select
                              value={privacy}
                              onChange={(e) => setPrivacy(e.target.value)}
                              className="mt-2 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
                            >
                              <option value="everyone">{t('studio.editPost.everyone')}</option>
                              <option value="friends">{t('studio.editPost.friends')}</option>
                              <option value="onlyYou">{t('studio.editPost.onlyYou')}</option>
                            </select>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.hdUpload')}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {t('studio.editPost.hdHint')}
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
                            <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.allowUsers')}</p>
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={allowComment}
                                onChange={(e) => setAllowComment(e.target.checked)}
                                className="rounded border-zinc-600 accent-[#fe2c55]"
                              />
                              {t('studio.editPost.comments')}
                            </label>
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={allowReuse}
                                onChange={(e) => setAllowReuse(e.target.checked)}
                                className="rounded border-zinc-600 accent-[#fe2c55]"
                              />
                              {t('studio.editPost.reuse')}
                              <IoInformationCircleOutline className="text-zinc-500" aria-hidden />
                            </label>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.disclose')}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {t('studio.editPost.discloseHint')}
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
                              <p className="text-sm font-semibold text-zinc-200">{t('studio.editPost.aiGenerated')}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Thêm nhãn này cho nội dung do AI tạo ra.{' '}
                                <span className="text-[#fe2c55]">{t('studio.editPost.learnMore')}</span>
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
                      disabled={busy || !hasUnsavedChanges}
                    >
                      {busy ? t('studio.editPost.saving') : t('common.save')}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => navigate('/vibelystudio/posts')}
                      disabled={busy}
                    >
                      {t('studio.editPost.cancel')}
                    </button>
                    {status ? <p className="text-sm text-amber-400">{status}</p> : null}
                  </div>
                </div>
              </div>

              <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[340px]">
                <div className="mb-3 flex gap-1 rounded-lg bg-zinc-900/90 p-1 ring-1 ring-zinc-800">
                  {[
                    ['feed', t('studio.editPost.previewFeed')],
                    ['profile', t('studio.editPost.previewProfile')],
                    ['web', t('studio.editPost.previewWeb')],
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
                                    <IoPeopleOutline className="text-[11px]" /> {t("studio.privacy.friends")}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoAddCircleOutline className="text-[11px]" /> +
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoMailOutline className="text-[11px]" /> Inbox
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <IoPersonOutline className="text-[11px]" /> {t("studio.privacy.onlyYou")}
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
                          aria-label={t('studio.editPost.toggleFullscreen')}
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
                          aria-label={isPreviewMuted ? t('studio.editPost.unmute') : t('studio.editPost.mute')}
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
                            {user?.displayName ?? t('common.user')}
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
                        {t('studio.editPost.noPreview')}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      [t('studio.editPost.toolEdit'), '✂'],
                      [t('studio.editPost.toolSound'), '♪'],
                      [t('studio.editPost.toolText'), 'Aa'],
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
