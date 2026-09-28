import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGuestAuthUi } from '@/features/auth/store/GuestAuthUiContext.jsx'
import { buildAbsoluteUrl } from '@/features/post/utils/shareUrl.js'
import { LIVE_LIKE, LIVE_ROOM_EVENT } from '@/features/live/constants/liveConstants.js'
import { liveService } from '@/features/live/services/liveService.js'
import { createLikeBatcher } from '@/features/live/utils/likeBatcher.js'

const SHARE_FEEDBACK_MS = 2000

/** Returns a guard that opens the guest login modal when there is no session. */
export function useLiveAuthGate() {
  const { token } = useAuth()
  const guestUi = useGuestAuthUi()
  return useCallback(() => {
    if (token) return true
    guestUi?.openLogin?.()
    return false
  }, [guestUi, token])
}

/** Viewer count: initial value from metadata, then pushed by the room channel. */
export function useLiveViewerCount({ room, initialCount }) {
  const [count, setCount] = useState(initialCount ?? 0)

  useEffect(() => {
    setCount(initialCount ?? 0)
  }, [initialCount])

  useEffect(
    () => room.subscribe(LIVE_ROOM_EVENT.VIEWER_COUNT, (payload) => setCount(Number(payload?.count) || 0)),
    [room.subscribe],
  )

  return count
}

/**
 * Optimistic likes. Each tap updates the UI immediately and is aggregated by
 * `createLikeBatcher`, so the backend receives one call per batch window.
 */
export function useLiveLikes({ liveId, token, room, initialCount }) {
  const [serverCount, setServerCount] = useState(initialCount ?? 0)
  const [pendingCount, setPendingCount] = useState(0)
  const [bursts, setBursts] = useState([])
  const batcherRef = useRef(null)
  const burstSeqRef = useRef(0)

  useEffect(() => {
    setServerCount(initialCount ?? 0)
  }, [initialCount])

  useEffect(() => {
    if (!liveId) return undefined
    const batcher = createLikeBatcher({
      flush: async (count) => {
        try {
          const result = await liveService.sendLikes(liveId, count, token)
          setServerCount((prev) =>
            Number.isFinite(result?.likeCount) ? result.likeCount : prev + count,
          )
        } finally {
          setPendingCount((prev) => Math.max(0, prev - count))
        }
      },
    })
    batcherRef.current = batcher
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') batcher.flushNow()
    }
    document.addEventListener('visibilitychange', flushOnHide)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide)
      batcher.dispose()
      batcherRef.current = null
    }
  }, [liveId, token])

  useEffect(
    () =>
      room.subscribe(LIVE_ROOM_EVENT.LIKE_COUNT, (payload) => {
        const count = Number(payload?.count)
        if (Number.isFinite(count)) setServerCount(count)
      }),
    [room.subscribe],
  )

  const like = useCallback(() => {
    if (!batcherRef.current) return
    batcherRef.current.add()
    setPendingCount((prev) => prev + 1)
    burstSeqRef.current += 1
    const burst = { id: burstSeqRef.current, offset: (burstSeqRef.current % 5) - 2 }
    setBursts((prev) => [...prev, burst].slice(-LIVE_LIKE.MAX_VISIBLE_BURSTS))
  }, [])

  const removeBurst = useCallback((id) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id))
  }, [])

  return { likeCount: serverCount + pendingCount, bursts, like, removeBurst }
}

/** Optimistic follow toggle with rollback on failure. */
export function useLiveFollow({ liveId, token, initialFollowing }) {
  const [following, setFollowing] = useState(Boolean(initialFollowing))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFollowing(Boolean(initialFollowing))
  }, [initialFollowing])

  const toggle = useCallback(async () => {
    if (busy || !liveId) return
    const next = !following
    setFollowing(next)
    setBusy(true)
    try {
      if (next) await liveService.followHost(liveId, token)
      else await liveService.unfollowHost(liveId, token)
    } catch {
      setFollowing(!next)
    } finally {
      setBusy(false)
    }
  }, [busy, following, liveId, token])

  return { following, busy, toggle }
}

/** Gift catalog is fetched lazily the first time the panel opens. */
export function useLiveGifts({ liveId, token }) {
  const [catalog, setCatalog] = useState({ status: 'idle', items: [] })
  const [sendingId, setSendingId] = useState(null)
  const [lastSent, setLastSent] = useState(null)

  const loadCatalog = useCallback(async () => {
    setCatalog((prev) => (prev.status === 'success' ? prev : { status: 'loading', items: [] }))
    try {
      const items = await liveService.getGiftCatalog(token)
      setCatalog({ status: 'success', items: Array.isArray(items) ? items : [] })
    } catch {
      setCatalog({ status: 'error', items: [] })
    }
  }, [token])

  const sendGift = useCallback(
    async (giftId) => {
      if (!liveId || sendingId) return false
      setSendingId(giftId)
      try {
        const result = await liveService.sendGift(liveId, giftId, token)
        setLastSent(result?.gift ?? null)
        return true
      } catch {
        return false
      } finally {
        setSendingId(null)
      }
    },
    [liveId, sendingId, token],
  )

  return { catalog, loadCatalog, sendGift, sendingId, lastSent }
}

/** Native share sheet when available, clipboard copy otherwise. */
export function useLiveShare({ liveId, title }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const share = useCallback(async () => {
    if (!liveId) return
    const url = buildAbsoluteUrl(`/live/${encodeURIComponent(liveId)}`)
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard?.writeText(url)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), SHARE_FEEDBACK_MS)
    } catch {
      /* user dismissed the share sheet */
    }
  }, [liveId, title])

  return { share, copied }
}
