import React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, uploadThumbnailToStorage, uploadToPresignedPutUrl } from '../api/client'
import { CoverPickerModal } from '../components/CoverPickerModal'
import { StudioLayout } from '../components/StudioLayout'
import { extractThumbnailBlobFromFile } from '../utils/videoThumbnail.js'
import {
  deleteUploadDraftKeepalive,
  readUploadDraftPublicIds,
  trackUploadDraftPublicId,
  untrackUploadDraftPublicId,
} from '../utils/uploadDraftCleanup.js'
import {
  MAX_VIDEO_DURATION_SECONDS,
  isDurationLimitRejectMessage,
  resolveUploadContentType,
  validateVideoFileBasics,
  validateVideoMetadata,
} from '../utils/videoUploadConstraints.js'
import { useAuth } from '../state/useAuth'
import { LuHeart, LuLayoutGrid, LuMinimize2, LuRepeat2, LuSmartphone, LuWifi } from 'react-icons/lu'
import {
  IoArrowRedoOutline,
  IoBatteryFullOutline,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircle,
  IoChevronBack,
  IoClose,
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
  IoWarningOutline,
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

function formatClockMmSs(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseOriginalityExplain(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function buildOriginalityViolationCopy(originalityStatus) {
  const decision = String(originalityStatus?.decision || '')
  const explain = parseOriginalityExplain(originalityStatus?.explainJson)
  const wmLabels = Array.isArray(explain?.watermark?.labels) ? explain.watermark.labels : []
  const downloaderHints = Array.isArray(explain?.metadata?.downloaderHints)
    ? explain.metadata.downloaderHints
    : []
  const reasons = []
  if (downloaderHints.length > 0) {
    reasons.push('nội dung tải từ nền tảng khác (có dấu hiệu công cụ tải)')
  }
  if (wmLabels.length > 0) {
    reasons.push('có dấu hiệu watermark/logo nền tảng khác')
  }
  if (Number(originalityStatus?.visualSimilarity || 0) >= 0.55) {
    reasons.push('nội dung trùng khớp cao với video đã có trên Vibely')
  }
  if (reasons.length === 0) {
    reasons.push('nội dung không nguyên gốc hoặc chất lượng thấp')
  }

  const reasonTitle =
    decision === 'BLOCK'
      ? 'Nội dung không nguyên gốc — bị chặn đăng'
      : 'Nội dung không nguyên gốc, chất lượng thấp hoặc dấu hiệu tái tải'

  const reasonBody =
    'Nội dung không nguyên gốc gồm video nhập/sao chép mà không có chỉnh sửa sáng tạo rõ ràng, ' +
    'video mang watermark/logo nền tảng khác, hoặc tệp đến từ công cụ tải bên thứ ba. ' +
    'Nội dung chất lượng thấp gồm video quá ngắn, ảnh tĩnh hoặc nội dung gần như không đổi cảnh. ' +
    `(Phát hiện: ${reasons.join('; ')}.)`

  return { reasonTitle, reasonBody }
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
  return extractThumbnailBlobFromFile(file, atSecond, timeoutMs)
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

function isInvalidApiVideoPlaybackUrl(url) {
  const raw = String(url ?? '').trim()
  if (!raw) return true
  return /(?:^|\/\/[^/]+)\/api\/videos\/\d+(?:$|[/?#])/i.test(raw)
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
  const descriptionWrapRef = useRef(null)
  const descriptionTextareaRef = useRef(null)
  const mentionDropdownRef = useRef(null)
  const [mentionableFriends, setMentionableFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [loadingMentionSuggestions, setLoadingMentionSuggestions] = useState(false)
  const [mentionAtCaret, setMentionAtCaret] = useState(null) // { query, replaceStart, replaceEnd }
  const [mentionDropdownPos, setMentionDropdownPos] = useState({ top: 0, left: 0 })
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [status, setStatus] = useState('')
  const [uploadErrorToast, setUploadErrorToast] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const uploadErrorTimerRef = useRef(null)
  const processingPollRef = useRef(0)
  const [busy, setBusy] = useState(false)
  /** 0–100 while S3 upload is in progress; null when idle / finished */
  const [uploadProgress, setUploadProgress] = useState(null)
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
  const [originalityStatus, setOriginalityStatus] = useState(null)
  const [originalityDetailsOpen, setOriginalityDetailsOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const draftPublicIdRef = useRef(null)
  const publishingRef = useRef(false)
  const discardingLeaveRef = useRef(false)
  const pendingLeaveToRef = useRef(null)

  const originalityCheck = useMemo(() => {
    if (!uploadedVideo?.publicId) return null
    const jobState = String(originalityStatus?.jobState || '')
    const decision = String(originalityStatus?.decision || '')
    if (!originalityStatus || !jobState || jobState === 'PENDING' || jobState === 'PROCESSING') {
      return {
        tone: 'pending',
        title: 'Kiểm tra nội dung',
        detail: 'Đang quét video… Có thể mất vài phút lần đầu.',
        showDetails: false,
      }
    }
    if (jobState === 'FAILED') {
      return {
        tone: 'warn',
        title: 'Kiểm tra nội dung',
        detail: 'Không hoàn tất kiểm tra. Bạn vẫn có thể đăng; hệ thống sẽ rà soát lại sau.',
        showDetails: false,
      }
    }
    if (decision === 'BLOCK') {
      return {
        tone: 'danger',
        title: 'Kiểm tra nội dung',
        detail: 'Nội dung bị chặn vì nghi ngờ không nguyên gốc. Hãy tải video khác.',
        showDetails: true,
      }
    }
    if (decision === 'LIMIT_DISTRIBUTION' || decision === 'REVIEW') {
      return {
        tone: 'danger',
        title: 'Kiểm tra nội dung',
        detail:
          'Nội dung có thể bị hạn chế phân phối. Bạn vẫn có thể đăng, nhưng chỉnh sửa để tuân thủ nguyên tắc có thể cải thiện khả năng hiển thị.',
        showDetails: true,
      }
    }
    return {
      tone: 'ok',
      title: 'Kiểm tra nội dung',
      detail: 'Không phát hiện vấn đề.',
      showDetails: false,
    }
  }, [uploadedVideo?.publicId, originalityStatus])

  const originalityViolationCopy = useMemo(
    () => buildOriginalityViolationCopy(originalityStatus),
    [originalityStatus],
  )

  const originalityBlockingPost =
    originalityCheck?.tone === 'pending' || String(originalityStatus?.decision || '') === 'BLOCK'

  useEffect(() => {
    document.title = 'VibelyStudio | Upload'
  }, [])

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
      detail: 'Khuyến nghị dùng .mp4. Cũng hỗ trợ .mov và .webm.',
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

    // Convert to viewport-absolute coordinates by relying on markerRect.
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

      // Update dropdown coordinates.
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
        const caretPos = mentionAtCaret.replaceStart + clean.length + 2 // '@' + username + ' '
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

  useEffect(() => {
    return () => {
      if (uploadErrorTimerRef.current) clearTimeout(uploadErrorTimerRef.current)
      processingPollRef.current += 1
    }
  }, [])

  const showUploadRejected = useCallback((message) => {
    const text = String(message || 'Video không đúng yêu cầu tải lên.')
    setStatus(text)
    setUploadErrorToast(text)
    if (uploadErrorTimerRef.current) clearTimeout(uploadErrorTimerRef.current)
    uploadErrorTimerRef.current = setTimeout(() => setUploadErrorToast(''), 8000)
  }, [])

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const markDraftTracked = useCallback((publicId) => {
    const id = String(publicId || '').trim()
    if (!id) return
    draftPublicIdRef.current = id
    trackUploadDraftPublicId(id)
  }, [])

  const discardDraftVideo = useCallback(
    async (publicId) => {
      const id = String(publicId || draftPublicIdRef.current || '').trim()
      if (!id) return
      untrackUploadDraftPublicId(id)
      if (draftPublicIdRef.current === id) draftPublicIdRef.current = null
      if (!token) {
        deleteUploadDraftKeepalive(id, null)
        return
      }
      try {
        await apiClient.deleteVideo(id, token)
      } catch {
        deleteUploadDraftKeepalive(id, token)
      }
    },
    [token],
  )

  /** Clear editor + force user to pick another file. */
  const resetUploadSession = useCallback(() => {
    processingPollRef.current += 1
    const draftId = draftPublicIdRef.current
    setVideoFile(null)
    setUploadedVideo(null)
    setThumbnailUrl('')
    setUploadProgress(null)
    setDescription('')
    setCoverModalOpen(false)
    setOriginalityStatus(null)
    setOriginalityDetailsOpen(false)
    resetFileInput()
    if (draftId) void discardDraftVideo(draftId)
  }, [resetFileInput, discardDraftVideo])

  const hasUnsavedUploadDraft = Boolean(
    uploadedVideo?.publicId || uploadedVideo?.playbackUrl,
  )

  useEffect(() => {
    if (!token) return undefined
    const liveId = String(draftPublicIdRef.current || '').trim()
    const orphans = readUploadDraftPublicIds().filter((id) => id !== liveId)
    if (orphans.length === 0) return undefined
    let cancelled = false
    void (async () => {
      for (const id of orphans) {
        if (cancelled) return
        untrackUploadDraftPublicId(id)
        try {
          await apiClient.deleteVideo(id, token)
        } catch {
          // đã gỡ / không còn quyền — bỏ qua
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (publishingRef.current) return
      const id = draftPublicIdRef.current || uploadedVideo?.publicId
      if (!id && !uploadedVideo?.playbackUrl) return
      event.preventDefault()
      event.returnValue =
        'Bạn chưa đăng video này. Nếu rời trang, video đã tải lên sẽ bị xóa.'
      return event.returnValue
    }
    const onPageHide = () => {
      if (publishingRef.current) return
      const id = draftPublicIdRef.current || uploadedVideo?.publicId
      if (!id) return
      // Reload/đóng tab: gửi DELETE keepalive; trang sau sẽ dọn orphan còn sót.
      deleteUploadDraftKeepalive(id, token)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [token, uploadedVideo?.publicId, uploadedVideo?.playbackUrl])

  // BrowserRouter không hỗ trợ useBlocker — chặn click link nội bộ + nút Back.
  useEffect(() => {
    if (!hasUnsavedUploadDraft || publishingRef.current) return undefined

    const onDocumentClick = (event) => {
      if (discardingLeaveRef.current || leaveConfirmOpen) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const hrefAttr = anchor.getAttribute('href')
      if (!hrefAttr || hrefAttr.startsWith('#')) return
      let url
      try {
        url = new URL(hrefAttr, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const nextPath = `${url.pathname}${url.search}${url.hash}`
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextPath === currentPath) return
      event.preventDefault()
      event.stopPropagation()
      pendingLeaveToRef.current = nextPath
      setLeaveConfirmOpen(true)
    }

    const onPopState = () => {
      if (discardingLeaveRef.current || publishingRef.current) return
      window.history.pushState(null, '', window.location.href)
      pendingLeaveToRef.current = '__BACK__'
      setLeaveConfirmOpen(true)
    }

    window.history.pushState(null, '', window.location.href)
    document.addEventListener('click', onDocumentClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onDocumentClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [hasUnsavedUploadDraft, leaveConfirmOpen])

  const confirmLeaveAndDiscard = useCallback(async () => {
    discardingLeaveRef.current = true
    setLeaveConfirmOpen(false)
    const to = pendingLeaveToRef.current
    pendingLeaveToRef.current = null
    await discardDraftVideo()
    setVideoFile(null)
    setUploadedVideo(null)
    setThumbnailUrl('')
    setUploadProgress(null)
    setDescription('')
    setOriginalityStatus(null)
    setOriginalityDetailsOpen(false)
    draftPublicIdRef.current = null
    if (to === '__BACK__') navigate(-1)
    else if (to) navigate(to)
    discardingLeaveRef.current = false
  }, [discardDraftVideo, navigate])

  const cancelLeave = useCallback(() => {
    setLeaveConfirmOpen(false)
    pendingLeaveToRef.current = null
    discardingLeaveRef.current = false
  }, [])

  const watchServerPostUploadChecks = useCallback(
    async (publicId) => {
      if (!token || !publicId) return
      const pollId = ++processingPollRef.current
      const deadline = Date.now() + 15 * 60 * 1000
      while (Date.now() < deadline && processingPollRef.current === pollId) {
        await new Promise((r) => setTimeout(r, 2500))
        if (processingPollRef.current !== pollId) return
        try {
          const video = await apiClient.getVideo(publicId, { token })
          if (processingPollRef.current !== pollId) return
          if (video?.status === 'FAILED') {
            const msg =
              video.processingError ||
              'Video bị từ chối. Vui lòng chọn video khác.'
            resetUploadSession()
            showUploadRejected(
              isDurationLimitRejectMessage(msg)
                ? msg
                : 'Video không đạt yêu cầu và đã bị gỡ. Vui lòng tải video khác lên.',
            )
            return
          }

          let originality = null
          try {
            originality = await apiClient.getVideoOriginality(publicId, token)
          } catch {
            originality = null
          }
          if (processingPollRef.current !== pollId) return
          if (originality) {
            setOriginalityStatus(originality)
            const decision = String(originality.decision || '')
            // Hard block only — LIMIT/REVIEW keep the draft and show Checks warning (TikTok-style).
            if (decision === 'BLOCK') {
              resetUploadSession()
              showUploadRejected(
                `Video bị chặn vì nghi ngờ không nguyên gốc. ` +
                  `Originality ${Number(originality.originalityScore ?? 0).toFixed(1)}. ` +
                  'Vui lòng tải video khác lên.',
              )
              return
            }
            if (
              originality.jobState === 'COMPLETED' ||
              originality.jobState === 'FAILED'
            ) {
              return
            }
          }
        } catch {
          // Keep polling.
        }
      }
    },
    [token, resetUploadSession, showUploadRejected],
  )

  const handleSelectedFile = async (file) => {
    if (!file) return

    if (!token) {
      showUploadRejected('Bạn cần đăng nhập trước khi đăng tải.')
      resetFileInput()
      return
    }

    const basicError = validateVideoFileBasics(file)
    if (basicError) {
      resetUploadSession()
      showUploadRejected(basicError)
      return
    }

    // Thay thế video: hủy draft cũ (DB + S3) trước khi tải file mới.
    const previousDraftId = draftPublicIdRef.current || uploadedVideo?.publicId
    if (previousDraftId) {
      processingPollRef.current += 1
      await discardDraftVideo(previousDraftId)
    }

    setThumbnailUrl('')
    setUploadProgress(null)
    setOriginalityStatus(null)
    setOriginalityDetailsOpen(false)
    setBusy(true)
    try {
      const inferredTitle = String(file.name ?? 'Video mới')
        .replace(/\.[^/.]+$/, '')
        .trim()
      const meta = await readVideoMetadata(file)
      const metaError = validateVideoMetadata(meta)
      if (metaError) {
        resetUploadSession()
        showUploadRejected(metaError)
        return
      }

      const durationSeconds = Math.round(Number(meta.duration))
      setVideoFile(file)

      // TikTok-style: show editor card immediately; bar tracks upload progress.
      setUploadedVideo({
        fileName: file.name,
        fileSize: file.size,
        title: inferredTitle || 'Video mới',
        playbackUrl: '',
        audioUrl: '',
        audioTitle: `âm thanh gốc - ${user?.displayName || user?.username || 'Vibely'}`,
        resolutionLabel: formatResolutionLabel(meta.width, meta.height),
        durationSeconds,
        publicId: null,
      })
      setDescription(inferredTitle || 'Video mới')
      setPreviewTab('feed')
      setStatus('')
      setUploadErrorToast('')
      setUploadProgress(0)

      const contentType = resolveUploadContentType(file)
      const presign = await apiClient.presignVideoUpload(token, {
        contentType,
        fileName: file.name,
        fileSizeBytes: file.size,
      })

      await uploadToPresignedPutUrl(
        presign.uploadUrl,
        file,
        presign.contentType,
        (percent) => setUploadProgress(percent),
      )
      const playbackUrl = presign.playbackUrl
      const audioUrl = deriveAudioUrlFromVideoUrl(playbackUrl)
      const audioTitle = `âm thanh gốc - ${user?.displayName || user?.username || 'Vibely'}`
      let autoThumbUrl = ''
      try {
        const thumbBlob = await extractThumbnailBlob(file, 1)
        autoThumbUrl = await uploadThumbnailToStorage(
          token,
          thumbBlob,
          `${inferredTitle || 'cover'}.jpg`,
        )
      } catch {
        // Không chặn luồng đăng video nếu tạo thumbnail tự động thất bại.
      }

      // Create immediately so server ffprobe can reject over-duration and delete S3
      // while the user is still on the upload page.
      let created
      try {
        created = await apiClient.createVideo(
          {
            title: (inferredTitle || 'Video mới').slice(0, 120),
            description: (inferredTitle || 'Video mới').slice(0, 1000),
            videoUrl: playbackUrl,
            thumbnailUrl: autoThumbUrl || undefined,
            audioUrl,
            audioTitle,
            durationSeconds,
          },
          token,
        )
      } catch (createErr) {
        const msg = createErr?.message ?? 'Không thể đăng ký video sau khi tải lên.'
        resetUploadSession()
        showUploadRejected(
          isDurationLimitRejectMessage(msg)
            ? msg
            : `${msg} Vui lòng chọn video khác.`,
        )
        return
      }

      if (autoThumbUrl) {
        setThumbnailUrl(autoThumbUrl)
      }
      setUploadedVideo({
        fileName: file.name,
        fileSize: file.size,
        title: inferredTitle || 'Video mới',
        playbackUrl,
        audioUrl,
        audioTitle,
        resolutionLabel: formatResolutionLabel(meta.width, meta.height),
        durationSeconds,
        publicId: created?.publicId ?? null,
      })
      setUploadProgress(null)
      setStatus('')
      if (created?.publicId) {
        markDraftTracked(created.publicId)
        void watchServerPostUploadChecks(created.publicId)
      }
    } catch (error) {
      resetUploadSession()
      showUploadRejected(error.message ?? 'Đăng tải thất bại.')
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
                'video/mp4': ['.mp4', '.m4v'],
                'video/quicktime': ['.mov'],
                'video/webm': ['.webm'],
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

  const onDropZoneDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!busy) setDragActive(true)
  }

  const onDropZoneDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
  }

  const onDropZoneDrop = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (busy) return
    const file = event.dataTransfer?.files?.[0] ?? null
    await handleSelectedFile(file)
  }

  const saveVideo = async () => {
    if (!token || !uploadedVideo) return
    if (!uploadedVideo.playbackUrl || uploadProgress != null) {
      setStatus('Vui lòng đợi video tải lên xong rồi đăng.')
      return
    }
    if (isInvalidApiVideoPlaybackUrl(uploadedVideo.playbackUrl)) {
      setStatus('URL video không hợp lệ. Vui lòng tải lại video rồi thử đăng lại.')
      return
    }
    const durationSeconds = Number(uploadedVideo.durationSeconds)
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      durationSeconds > MAX_VIDEO_DURATION_SECONDS
    ) {
      resetUploadSession()
      showUploadRejected(
        'Video vượt quá thời lượng tối đa 60 phút. Vui lòng chọn video khác.',
      )
      return
    }
    if (description.length > DESC_MAX) {
      setStatus(`Mô tả không quá ${DESC_MAX} ký tự.`)
      return
    }
    setBusy(true)
    publishingRef.current = false
    try {
      const title = (uploadedVideo.title || 'Video mới').slice(0, 120)
      const desc = description.trim().slice(0, 1000)
      if (uploadedVideo.publicId) {
        const latest = await apiClient.getVideo(uploadedVideo.publicId, { token })
        if (latest?.status === 'FAILED') {
          const msg =
            latest.processingError ||
            'Video bị từ chối. Vui lòng chọn video khác.'
          resetUploadSession()
          showUploadRejected(msg)
          return
        }
        await apiClient.updateVideo(
          uploadedVideo.publicId,
          {
            title,
            description: desc,
            thumbnailUrl: thumbnailUrl.trim() || undefined,
          },
          token,
        )
        untrackUploadDraftPublicId(uploadedVideo.publicId)
        draftPublicIdRef.current = null
      } else {
        await apiClient.createVideo(
          {
            title,
            description: desc,
            videoUrl: uploadedVideo.playbackUrl,
            thumbnailUrl: thumbnailUrl.trim(),
            audioUrl: uploadedVideo.audioUrl,
            audioTitle: uploadedVideo.audioTitle,
            durationSeconds: Math.round(durationSeconds),
          },
          token,
        )
      }
      publishingRef.current = true
      processingPollRef.current += 1
      navigate('/vibelystudio/posts', {
        state: { successMessage: 'Đã đăng video thành công.' },
      })
      return
    } catch (error) {
      publishingRef.current = false
      const msg = error.message ?? 'Không thể lưu video.'
      if (isDurationLimitRejectMessage(msg)) {
        resetUploadSession()
        showUploadRejected(msg)
      } else {
        setStatus(msg)
      }
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
      {uploadErrorToast ? (
        <div
          role="alert"
          className="fixed top-4 right-4 left-4 z-[120] mx-auto max-w-lg rounded-xl border border-rose-500/40 bg-zinc-950/95 px-4 py-3 text-sm text-rose-100 shadow-xl backdrop-blur sm:left-auto"
        >
          <p className="font-semibold text-rose-300">Không thể tải lên</p>
          <p className="mt-1 text-pretty text-rose-100/90">{uploadErrorToast}</p>
          <p className="mt-2 text-xs text-rose-200/80">Vui lòng chọn một video khác đạt yêu cầu.</p>
        </div>
      ) : null}
      <CoverPickerModal
        open={coverModalOpen && Boolean(uploadedVideo)}
        onClose={() => setCoverModalOpen(false)}
        videoFile={videoFile}
        token={token}
        onConfirm={(url) => setThumbnailUrl(url)}
      />
      {originalityDetailsOpen && originalityCheck?.showDetails ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4 py-6"
          role="presentation"
          onClick={() => setOriginalityDetailsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="originality-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white text-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-zinc-200 px-5 py-4">
              <IoWarningOutline className="mt-0.5 shrink-0 text-2xl text-orange-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 id="originality-details-title" className="text-lg font-bold text-zinc-900">
                  {String(originalityStatus?.decision || '') === 'BLOCK'
                    ? 'Nội dung bị chặn'
                    : 'Nội dung có thể bị hạn chế'}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {String(originalityStatus?.decision || '') === 'BLOCK'
                    ? 'Video này không thể đăng vì nghi ngờ không nguyên gốc. Hãy thay thế bằng video khác.'
                    : 'Bạn vẫn có thể đăng, nhưng chỉnh sửa để tuân thủ nguyên tắc có thể cải thiện khả năng hiển thị.'}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Đóng"
                onClick={() => setOriginalityDetailsOpen(false)}
              >
                <IoClose className="text-xl" aria-hidden />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <section>
                <h3 className="text-sm font-bold text-zinc-900">Lý do vi phạm</h3>
                <p className="mt-2 text-sm font-semibold text-zinc-800">
                  {originalityViolationCopy.reasonTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {originalityViolationCopy.reasonBody}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-zinc-900">Chi tiết vi phạm</h3>
                <p className="mt-2 text-sm text-zinc-600">Một số dấu hiệu tiềm ẩn đã được phát hiện.</p>
                <div className="mt-3 inline-block overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                  {thumbnailUrl || uploadedVideo?.playbackUrl ? (
                    <div className="relative h-28 w-28">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt="Đoạn video bị gắn cờ"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={uploadedVideo.playbackUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-center text-[11px] font-medium text-white">
                        00:00-
                        {formatClockMmSs(
                          Math.min(15, Number(uploadedVideo?.durationSeconds) || 15),
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center text-xs text-zinc-500">
                      Không có xem trước
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex justify-end border-t border-zinc-200 px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => {
                  setOriginalityDetailsOpen(false)
                  void onPickFile()
                }}
              >
                <IoRefreshOutline className="text-lg" aria-hidden />
                Thay thế video
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {leaveConfirmOpen ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6"
          role="presentation"
          onClick={cancelLeave}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-leave-title"
            className="w-full max-w-md rounded-2xl bg-white text-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-2">
              <h2 id="upload-leave-title" className="text-lg font-bold text-zinc-900">
                Rời khỏi trang?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Bạn chưa đăng video này. Nếu rời đi, video đã tải lên sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                onClick={cancelLeave}
              >
                Ở lại
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#fe2c55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e62a4d]"
                onClick={() => void confirmLeaveAndDiscard()}
              >
                Rời đi
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.m4v,.mov,.webm"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:p-4 lg:p-6">
          {!uploadedVideo ? (
            <>
              <div
                className={`rounded-xl border border-dashed px-4 py-10 text-center sm:px-8 sm:py-14 ${
                  dragActive
                    ? 'border-[#fe2c55]/70 bg-[#fe2c55]/10'
                    : 'border-zinc-600/80 bg-zinc-950/80'
                }`}
                onDragEnter={onDropZoneDragOver}
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneDragLeave}
                onDrop={(e) => void onDropZoneDrop(e)}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 sm:h-16 sm:w-16">
                  <IoCloudUploadOutline className="text-2xl sm:text-3xl" aria-hidden />
                </div>
                <p className="mt-4 text-base font-semibold text-pretty text-zinc-100 sm:text-lg">
                  Chọn video để tải lên
                </p>
                <p className="mt-1 text-sm text-pretty text-zinc-500">
                  Hoặc kéo thả video vào khu vực này
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-lg bg-[#fe2c55] px-6 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow hover:bg-[#e62a4d] disabled:opacity-40"
                  onClick={onPickFile}
                  disabled={busy}
                >
                  Chọn video
                </button>
                {status ? (
                  <p className="mt-4 text-sm font-medium text-rose-400" role="alert">
                    {status}
                  </p>
                ) : null}
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
                      {uploadProgress != null ? (
                        <p className="mt-2 text-sm font-medium text-sky-400">
                          Đang tải lên… {uploadProgress}%
                        </p>
                      ) : uploadedVideo.playbackUrl ? (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                          <IoCheckmarkCircle className="text-lg" aria-hidden />
                          Đã tải lên ({formatFileSize(uploadedVideo.fileSize)})
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-400">Đang chuẩn bị…</p>
                      )}
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
                  <div className="h-1 w-full bg-zinc-800" aria-hidden>
                    <div
                      className={`h-full transition-[width] duration-150 ease-out ${
                        uploadProgress != null ? 'bg-sky-500' : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${
                          uploadProgress != null
                            ? Math.max(2, uploadProgress)
                            : uploadedVideo.playbackUrl
                              ? 100
                              : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">Chi tiết</h2>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Mô tả</label>
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
                            setActiveMentionIndex((idx) => (idx - 1 + mentionSuggestions.length) % mentionSuggestions.length)
                            return
                          }
                          if (e.key === 'Enter') {
                            if (!mentionSuggestions.length) return
                            e.preventDefault()
                            const picked = mentionSuggestions[activeMentionIndex]
                            if (picked?.username) replaceMentionAtCaret(picked.username)
                          }
                        }}
                        placeholder="Thêm mô tả cho video của bạn…"
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
                            <div className="px-3 py-2 text-xs text-zinc-400">Đang tải danh sách bạn bè…</div>
                          ) : loadingMentionSuggestions ? (
                            <div className="px-3 py-2 text-xs text-zinc-400">Đang tìm người dùng…</div>
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
                                      // Prevent textarea from losing focus/caret before we replace.
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
                            <div className="px-3 py-2 text-xs text-zinc-400">Không có kết quả</div>
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
                            # Thẻ hashtag
                          </button>
                          <button
                            type="button"
                            className="font-medium text-[#fe2c55] hover:underline"
                            onClick={() => insertAtCaret('@')}
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
                    {mentionAtCaret == null ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Gõ <span className="font-semibold text-zinc-300">@</span> để nhắc đến bất kỳ người dùng nào.
                      </p>
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
                          className="aspect-9/16 max-h-[280px] w-full bg-black object-contain"
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

                  <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Kiểm tra</h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-start gap-3">
                        <IoCheckmarkCircle className="mt-0.5 shrink-0 text-lg text-emerald-400" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200">Kiểm tra bản quyền nhạc</p>
                          <p className="mt-0.5 text-xs text-zinc-500">Không phát hiện vấn đề.</p>
                        </div>
                      </div>
                      {originalityCheck ? (
                        <div className="flex items-start gap-3">
                          {originalityCheck.tone === 'ok' ? (
                            <IoCheckmarkCircle className="mt-0.5 shrink-0 text-lg text-emerald-400" aria-hidden />
                          ) : originalityCheck.tone === 'pending' ? (
                            <span
                              className="mt-1 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200"
                              aria-hidden
                            />
                          ) : (
                            <IoWarningOutline className="mt-0.5 shrink-0 text-lg text-orange-400" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200">{originalityCheck.title}</p>
                            <p
                              className={`mt-0.5 text-xs leading-relaxed ${
                                originalityCheck.tone === 'danger'
                                  ? 'text-orange-300'
                                  : originalityCheck.tone === 'warn'
                                    ? 'text-amber-300'
                                    : 'text-zinc-500'
                              }`}
                            >
                              {originalityCheck.detail}
                              {originalityCheck.showDetails ? (
                                <>
                                  {' '}
                                  <button
                                    type="button"
                                    className="font-semibold text-[#fe2c55] hover:underline"
                                    onClick={() => setOriginalityDetailsOpen(true)}
                                  >
                                    Xem chi tiết
                                  </button>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-lg bg-[#fe2c55] px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#e62a4d] disabled:opacity-50"
                      onClick={() => void saveVideo()}
                      disabled={
                        busy ||
                        uploadProgress != null ||
                        !uploadedVideo.playbackUrl ||
                        originalityBlockingPost
                      }
                      title={
                        originalityCheck?.tone === 'pending'
                          ? 'Đợi kiểm tra nội dung hoàn tất'
                          : undefined
                      }
                    >
                      {uploadProgress != null
                        ? 'Đang tải lên…'
                        : busy
                          ? 'Đang đăng…'
                          : originalityCheck?.tone === 'pending'
                            ? 'Đang kiểm tra…'
                            : 'Đăng'}
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
                            src={
                              isInvalidApiVideoPlaybackUrl(uploadedVideo.playbackUrl)
                                ? undefined
                                : uploadedVideo.playbackUrl
                            }
                            poster={thumbnailUrl || undefined}
                            muted={isPreviewMuted}
                            playsInline
                            preload="auto"
                            loop
                            className="h-full w-full bg-black object-contain"
                            autoPlay
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
                                : 'h-full w-full bg-black object-contain'
                            }
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
