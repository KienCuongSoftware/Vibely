import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/client.js'
import {
  readFeedFollowedAuthorIds,
  writeFeedFollowedAuthorIds,
} from '@/features/follow/utils/feedFollowState.js'
import { resolveDisplayCaption } from '@/features/post/utils/videoCaption.js'
import {
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from '@/features/post/utils/videoPublicId.js'

const FEED_DEFAULT_AUTHOR_AVATAR = '/images/users/default-avatar.jpeg'
const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'

function isPendingModerationStatus(status) {
  const s = String(status || '').toUpperCase()
  return s === 'HIDDEN' || s === 'PROCESSING' || s === 'RAW'
}

function normalizeFeedVideo(row, followedAuthorIds) {
  if (!row) return null
  const rawAvatar = row?.authorAvatarUrl ?? row?.avatarUrl
  const authorId = Number(row?.authorId)
  const isAuthorFollowed =
    Boolean(row?.isAuthorFollowed) ||
    (Number.isFinite(authorId) &&
      authorId > 0 &&
      followedAuthorIds.has(authorId))
  return {
    ...row,
    isAuthorFollowed,
    avatarUrl:
      rawAvatar != null && String(rawAvatar).trim()
        ? String(rawAvatar).trim()
        : FEED_DEFAULT_AUTHOR_AVATAR,
    shareCount: Number(row.shareCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
  }
}

function videoDocumentTitle(video, forYouStyle) {
  const desc = resolveDisplayCaption(video)
  if (!desc) return 'Vibely'
  return forYouStyle ? desc : `${desc} | Vibely`
}

/**
 * Load video / comments / related + follow session set for detail page.
 */
export function useFeedStyleVideoDetailData({
  publicId,
  routeUsername,
  token,
  buildDetailVideoUrl,
  navigate,
  notificationId,
  useActivitySidebar = false,
  refreshUnreadCount,
  decrementUnreadCount,
}) {
  const { t } = useTranslation()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPostError, setCommentPostError] = useState('')
  const [related, setRelated] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [followedAuthorIds, setFollowedAuthorIds] = useState(() =>
    readFeedFollowedAuthorIds(token),
  )

  const patchVideo = useCallback((patch) => {
    setVideo((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const markAuthorFollowedInSession = useCallback(
    (authorId) => {
      const key = Number(authorId)
      if (!Number.isFinite(key) || key <= 0) return
      setFollowedAuthorIds((prev) => {
        const next = new Set(prev)
        next.add(key)
        writeFeedFollowedAuthorIds(token, next)
        return next
      })
    },
    [token],
  )

  useEffect(() => {
    setFollowedAuthorIds(readFeedFollowedAuthorIds(token))
  }, [token])

  useEffect(() => {
    if (!token || !notificationId || !useActivitySidebar) {
      void refreshUnreadCount?.()
      return undefined
    }
    let cancelled = false
    ;(async () => {
      try {
        await apiClient.markNotificationRead(notificationId, token)
        if (!cancelled) decrementUnreadCount?.(1)
      } catch {
        /* inbox click should have marked already */
      } finally {
        if (!cancelled) void refreshUnreadCount?.()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    decrementUnreadCount,
    notificationId,
    refreshUnreadCount,
    token,
    useActivitySidebar,
  ])

  useEffect(() => {
    if (!publicId) {
      setLoadError(t('watch.invalidLink'))
      setVideo(null)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    apiClient
      .getVideo(publicId, { token })
      .then((row) => {
        if (cancelled) return
        setVideo(row)
        const authorKey = String(row?.authorUsername ?? '')
          .trim()
          .replace(/^@/, '')
          .toLowerCase()
        const routeKey = String(routeUsername ?? '')
          .trim()
          .replace(/^@/, '')
          .toLowerCase()
        const canonical = buildDetailVideoUrl?.(authorKey, videoPublicIdOf(row))
        if (canonical && authorKey && routeKey && authorKey !== routeKey) {
          navigate(canonical, { replace: true })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setVideo(null)
        setLoadError(err instanceof Error ? err.message : t('watch.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [buildDetailVideoUrl, navigate, publicId, routeUsername, t, token])

  useEffect(() => {
    if (!publicId) return undefined
    let cancelled = false
    setCommentsLoading(true)
    setCommentsError('')
    apiClient
      .getComments(publicId, { token })
      .then((list) => {
        if (!cancelled) setComments(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setCommentsError(
            err instanceof Error ? err.message : t('watch.loadCommentsFailed'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicId, t, token])

  useEffect(() => {
    if (!publicId) return undefined
    let cancelled = false
    setRelatedLoading(true)
    apiClient
      .getExploreRelated(publicId, { size: 18 })
      .then((page) => {
        if (cancelled) return
        const items = Array.isArray(page?.items) ? page.items : []
        setRelated(
          items.filter(
            (row) => normalizeVideoPublicId(row?.publicId) !== publicId,
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicId])

  const submitComment = useCallback(async () => {
    const text = commentDraft.trim()
    if (!text || !token || !isVideoPublicId(publicId)) return
    setCommentPostError('')
    try {
      const created = await apiClient.addComment(publicId, text, token)
      setCommentDraft('')
      setComments((prev) => [created, ...prev])
      patchVideo({ commentCount: Number(video?.commentCount ?? 0) + 1 })
    } catch (err) {
      setCommentPostError(
        err instanceof Error ? err.message : t('watch.sendCommentFailed'),
      )
    }
  }, [commentDraft, patchVideo, publicId, t, token, video?.commentCount])

  const feedVideo = useMemo(
    () => normalizeFeedVideo(video, followedAuthorIds),
    [video, followedAuthorIds],
  )
  const feedVideos = useMemo(() => (feedVideo ? [feedVideo] : []), [feedVideo])
  const pendingModeration = isPendingModerationStatus(feedVideo?.status)
  const authorProfilePath = feedVideo?.authorUsername
    ? `/@${encodeURIComponent(String(feedVideo.authorUsername).replace(/^@/, ''))}`
    : '/foryou'

  // SEO title luôn dạng "desc | Vibely" (giữ hành vi cũ).
  const videoSeoTitle = videoDocumentTitle(video, false)
  const videoSeoDescription = t('watchPage.seoDescription')
  const videoSeoCanonical =
    buildDetailVideoUrl?.(
      video?.authorUsername ?? routeUsername,
      videoPublicIdOf(video) ?? publicId,
    ) || (publicId ? `/watch/${publicId}` : '/foryou')
  const videoSeoImage =
    video?.thumbnailUrl || video?.authorAvatarUrl || DEFAULT_AVATAR

  return {
    video,
    loading,
    loadError,
    comments,
    commentsLoading,
    commentsError,
    commentDraft,
    setCommentDraft,
    commentPostError,
    setCommentPostError,
    related,
    relatedLoading,
    followedAuthorIds,
    patchVideo,
    markAuthorFollowedInSession,
    submitComment,
    feedVideo,
    feedVideos,
    pendingModeration,
    authorProfilePath,
    videoSeoTitle,
    videoSeoDescription,
    videoSeoCanonical,
    videoSeoImage,
  }
}
