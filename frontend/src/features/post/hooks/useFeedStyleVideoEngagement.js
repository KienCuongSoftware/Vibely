import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '@/shared/api/client.js'
import { getVideoDurationSeconds } from '@/features/feed/utils/videoDuration.js'
import { buildShareableVideoUrl } from '@/features/post/utils/shareUrl.js'
import {
  isVideoPublicId,
  normalizeVideoPublicId,
} from '@/features/post/utils/videoPublicId.js'
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from '@/features/post/utils/watchQualifiesForViewRecord.js'
import {
  resolveViewTrafficAttribution,
  withViewTrafficFields,
} from '@/features/post/utils/viewTrafficAttribution.js'

/**
 * Like / bookmark / repost / follow / share / view-record for detail page.
 */
export function useFeedStyleVideoEngagement({
  publicId,
  token,
  forYouStyle = false,
  navigate,
  location,
  user,
  video,
  patchVideo,
  feedVideo,
  markAuthorFollowedInSession,
}) {
  const followBadgeTimerRef = useRef(null)
  const repostToastTimerRef = useRef(null)
  const detailViewQualifySentRef = useRef(false)
  const detailViewPlaythroughSentRef = useRef(false)

  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [repostBusy, setRepostBusy] = useState(false)
  const [repostToastOpen, setRepostToastOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [followBusyAuthorId, setFollowBusyAuthorId] = useState(null)
  const [followSuccessPublicId, setFollowSuccessPublicId] = useState(null)
  const [bookmarkToastOpen, setBookmarkToastOpen] = useState(false)
  const [bookmarkManageOpen, setBookmarkManageOpen] = useState(false)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState(() =>
    forYouStyle ? 'comments' : 'related',
  )

  const startFollowSuccessFlash = useCallback((vid) => {
    const key = normalizeVideoPublicId(vid)
    if (!key) return
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current)
    }
    setFollowSuccessPublicId(key)
    followBadgeTimerRef.current = setTimeout(() => {
      setFollowSuccessPublicId((current) => (current === key ? null : current))
      followBadgeTimerRef.current = null
    }, 500)
  }, [])

  const clearFollowSuccessFlash = useCallback((vid) => {
    const key = normalizeVideoPublicId(vid)
    if (!key) return
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current)
      followBadgeTimerRef.current = null
    }
    setFollowSuccessPublicId((current) => (current === key ? null : current))
  }, [])

  const showActiveAuthorFollowBadge = useMemo(() => {
    if (!forYouStyle || !feedVideo) return false
    const authorId = Number(feedVideo.authorId)
    if (!Number.isFinite(authorId) || authorId <= 0) return false
    if (Number(user?.id) === authorId) return false
    return !feedVideo.isAuthorFollowed
  }, [feedVideo, forYouStyle, user?.id])

  const showActiveAuthorFollowSuccess = useMemo(() => {
    return (
      normalizeVideoPublicId(feedVideo?.publicId) != null &&
      normalizeVideoPublicId(feedVideo?.publicId) === followSuccessPublicId
    )
  }, [feedVideo?.publicId, followSuccessPublicId])

  const handleActiveAuthorFollow = useCallback(async () => {
    const authorId = Number(feedVideo?.authorId)
    if (!Number.isFinite(authorId) || authorId <= 0) return
    if (!token) {
      navigate('/login')
      return
    }
    if (followBusyAuthorId === authorId) return
    setFollowBusyAuthorId(authorId)
    markAuthorFollowedInSession?.(authorId)
    patchVideo?.({ isAuthorFollowed: true })
    startFollowSuccessFlash(publicId)
    try {
      await apiClient.follow(authorId, token)
    } catch {
      clearFollowSuccessFlash(publicId)
      patchVideo?.({ isAuthorFollowed: false })
    } finally {
      setFollowBusyAuthorId(null)
    }
  }, [
    clearFollowSuccessFlash,
    feedVideo?.authorId,
    followBusyAuthorId,
    markAuthorFollowedInSession,
    navigate,
    patchVideo,
    publicId,
    startFollowSuccessFlash,
    token,
  ])

  const handleRepostToggle = useCallback(() => {
    if (!isVideoPublicId(publicId)) return
    if (!token) {
      navigate('/login')
      return
    }
    if (repostBusy) return
    const next = !reposted
    setRepostBusy(true)
    setReposted(next)
    if (next) {
      setRepostToastOpen(true)
      if (repostToastTimerRef.current) {
        window.clearTimeout(repostToastTimerRef.current)
      }
      repostToastTimerRef.current = window.setTimeout(() => {
        setRepostToastOpen(false)
      }, 2500)
    } else {
      setRepostToastOpen(false)
    }
    const req = next
      ? apiClient.repostVideo(publicId, token)
      : apiClient.unrepostVideo(publicId, token)
    req
      .catch(() => {
        setReposted(!next)
        if (next) setRepostToastOpen(false)
      })
      .finally(() => {
        setRepostBusy(false)
      })
  }, [navigate, publicId, repostBusy, reposted, token])

  const handleVideoContextShare = useCallback(() => {
    setShareOpen(true)
  }, [])

  const handleVideoContextCopyLink = useCallback(async () => {
    const url = buildShareableVideoUrl(video?.publicId, video?.authorUsername, {
      shareMethod: 'copy_link',
    })
    if (!url) return
    await navigator.clipboard.writeText(url)
  }, [video?.authorUsername, video?.publicId])

  useEffect(() => {
    if (!token || !publicId) return undefined
    let cancelled = false
    apiClient
      .getVideoMeState(publicId, token)
      .then((state) => {
        if (cancelled || !state) return
        setLiked(Boolean(state.liked))
        setBookmarked(Boolean(state.bookmarked))
        if (forYouStyle) setReposted(Boolean(state.reposted))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [forYouStyle, publicId, token])

  useEffect(() => {
    setSidebarTab(forYouStyle ? 'comments' : 'related')
    setLiked(false)
    setBookmarked(false)
    setReposted(false)
    setShareOpen(false)
    setBookmarkToastOpen(false)
    setBookmarkManageOpen(false)
    setRepostToastOpen(false)
    setMobilePanelOpen(false)
    detailViewQualifySentRef.current = false
    detailViewPlaythroughSentRef.current = false
  }, [publicId, forYouStyle])

  const onActiveFeedPlaybackTick = useCallback(
    (e) => {
      const el = e.currentTarget
      if (!el || el.tagName !== 'VIDEO' || !publicId) return
      const dur = getVideoDurationSeconds(el)
      const watchedMs = Math.floor(el.currentTime * 1000)
      const durationMs = dur > 0 ? Math.floor(dur * 1000) : null
      const attribution = resolveViewTrafficAttribution({
        pathname: location.pathname,
        search: location.search,
        state: location.state,
        videoPublicId: publicId,
        forYouStyle,
      })

      if (
        durationMs != null &&
        !detailViewPlaythroughSentRef.current &&
        watchTimeNearPlaythroughEnd(watchedMs, durationMs)
      ) {
        detailViewPlaythroughSentRef.current = true
        apiClient
          .recordVideoView(
            publicId,
            withViewTrafficFields({ watchedMs, durationMs }, attribution),
            { token },
          )
          .catch(() => {
            detailViewPlaythroughSentRef.current = false
          })
        return
      }

      if (detailViewQualifySentRef.current) return
      if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return
      detailViewQualifySentRef.current = true
      apiClient
        .recordVideoView(
          publicId,
          withViewTrafficFields(
            {
              watchedMs,
              ...(durationMs != null ? { durationMs } : {}),
            },
            attribution,
          ),
          { token },
        )
        .catch(() => {
          detailViewQualifySentRef.current = false
        })
    },
    [
      forYouStyle,
      location.pathname,
      location.search,
      location.state,
      publicId,
      token,
    ],
  )

  useEffect(
    () => () => {
      if (followBadgeTimerRef.current != null) {
        clearTimeout(followBadgeTimerRef.current)
      }
      if (repostToastTimerRef.current != null) {
        window.clearTimeout(repostToastTimerRef.current)
      }
    },
    [],
  )

  const toggleLike = useCallback(() => {
    if (!token || !isVideoPublicId(publicId)) {
      if (!token) navigate('/login')
      return
    }
    const next = !liked
    const prevCount = Number(video?.likeCount ?? 0)
    setLiked(next)
    patchVideo?.({ likeCount: Math.max(0, prevCount + (next ? 1 : -1)) })
    const req = next
      ? apiClient.likeVideo(publicId, token)
      : apiClient.unlikeVideo(publicId, token)
    req.catch(() => {
      setLiked(!next)
      patchVideo?.({ likeCount: prevCount })
    })
  }, [liked, navigate, patchVideo, publicId, token, video?.likeCount])

  const toggleBookmark = useCallback(() => {
    if (!token || !isVideoPublicId(publicId)) {
      if (!token) navigate('/login')
      return
    }
    const next = !bookmarked
    const prevCount = Number(video?.bookmarkCount ?? 0)
    setBookmarked(next)
    patchVideo?.({ bookmarkCount: Math.max(0, prevCount + (next ? 1 : -1)) })
    if (forYouStyle && next) {
      setBookmarkToastOpen(true)
    } else if (forYouStyle) {
      setBookmarkToastOpen(false)
      setBookmarkManageOpen(false)
    }
    const req = next
      ? apiClient.bookmarkVideo(publicId, token)
      : apiClient.unbookmarkVideo(publicId, token)
    req.catch(() => {
      setBookmarked(!next)
      patchVideo?.({ bookmarkCount: prevCount })
      if (forYouStyle && next) setBookmarkToastOpen(false)
    })
  }, [
    bookmarked,
    forYouStyle,
    navigate,
    patchVideo,
    publicId,
    token,
    video?.bookmarkCount,
  ])

  const openBookmarkManagePopover = useCallback(() => {
    setBookmarkToastOpen(false)
    setBookmarkManageOpen(true)
  }, [])

  const openNewCollectionModal = useCallback(() => {
    setBookmarkManageOpen(false)
    setNewCollectionOpen(true)
  }, [])

  return {
    liked,
    bookmarked,
    reposted,
    repostBusy,
    repostToastOpen,
    setRepostToastOpen,
    shareOpen,
    setShareOpen,
    followBusyAuthorId,
    followSuccessPublicId,
    bookmarkToastOpen,
    setBookmarkToastOpen,
    bookmarkManageOpen,
    setBookmarkManageOpen,
    newCollectionOpen,
    setNewCollectionOpen,
    mobilePanelOpen,
    setMobilePanelOpen,
    sidebarTab,
    setSidebarTab,
    showActiveAuthorFollowBadge,
    showActiveAuthorFollowSuccess,
    handleActiveAuthorFollow,
    handleRepostToggle,
    handleVideoContextShare,
    handleVideoContextCopyLink,
    onActiveFeedPlaybackTick,
    toggleLike,
    toggleBookmark,
    openBookmarkManagePopover,
    openNewCollectionModal,
  }
}
