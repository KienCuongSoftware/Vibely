import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SuggestedCreatorsPanel } from '@/features/feed/components/SuggestedCreatorsPanel.jsx'
import { VerticalVideoFeed } from '@/features/feed/components/VerticalVideoFeed.jsx'
import { isMobileFeedLayout } from '@/features/feed/components/MobileFeedShell.jsx'
import {
  CreatorGridShell,
  GridLoadingState,
  GridLoginPrompt,
} from '@/features/feed/components/CreatorGridShell.jsx'
import { useSuggestedCreatorFollow } from '@/features/follow/hooks/useSuggestedCreatorFollow.js'
import {
  clearFollowingPreferFeedFromSidebar,
  peekFollowingPreferFeedFromSidebar,
  resolveFollowingViewMode,
} from '@/features/feed/utils/followingPageView.js'

const PAGE_TITLE = 'Đang follow | Vibely'

/** null = đang xác định; grid = lưới; feed = video (sidebar quay lại / F5 khi đã có video từ người follow). */
export function FollowingPage() {
  const { token, user, logout, authReady } = useAuth()
  const location = useLocation()
  const [mobileLayout, setMobileLayout] = useState(() => isMobileFeedLayout())
  const [viewMode, setViewMode] = useState(null)
  const {
    handleCreatorFollowed,
    handleCreatorUnfollowed,
    handleCreatorsMeta,
  } = useSuggestedCreatorFollow(token)

  useEffect(() => {
    document.title = PAGE_TITLE
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (mobileLayout) return undefined
    if (!authReady) return undefined
    if (!token) {
      setViewMode(null)
      return undefined
    }

    setViewMode(null)
    const preferFeed = peekFollowingPreferFeedFromSidebar()
    let cancelled = false

    ;(async () => {
      const mode = await resolveFollowingViewMode(token, { preferFeed })
      if (cancelled) return
      setViewMode(mode)
      if (preferFeed) clearFollowingPreferFeedFromSidebar()
    })()

    return () => {
      cancelled = true
    }
  }, [authReady, mobileLayout, token, location.key])

  const onCreatorFollowed = useCallback(
    (userId) => {
      handleCreatorFollowed(userId)
    },
    [handleCreatorFollowed],
  )

  const onCreatorUnfollowed = useCallback(
    (userId) => {
      handleCreatorUnfollowed(userId)
    },
    [handleCreatorUnfollowed],
  )

  const followingFeed = (
    <VerticalVideoFeed
      token={token}
      user={user}
      onLogout={logout}
      authReady={authReady}
      feedMode="following"
      activeMenuId="following"
    />
  )

  if (mobileLayout) {
    return followingFeed
  }

  if (!token) {
    return (
      <CreatorGridShell
        activeMenu="following"
        token={token}
        user={user}
        onLogout={logout}
      >
        <GridLoginPrompt
          title="Đăng nhập để xem Đã follow"
          description="Khám phá và theo dõi nhà sáng tạo bạn thích trên Vibely."
        />
      </CreatorGridShell>
    )
  }

  if (viewMode === null) {
    return (
      <CreatorGridShell
        activeMenu="following"
        token={token}
        user={user}
        onLogout={logout}
      >
        <GridLoadingState />
      </CreatorGridShell>
    )
  }

  if (viewMode === 'feed') {
    return followingFeed
  }

  return (
    <CreatorGridShell
      activeMenu="following"
      token={token}
      user={user}
      onLogout={logout}
    >
      <SuggestedCreatorsPanel
        token={token}
        onCreatorFollowed={onCreatorFollowed}
        onCreatorUnfollowed={onCreatorUnfollowed}
        onMetaLoaded={handleCreatorsMeta}
      />
    </CreatorGridShell>
  )
}

export default FollowingPage
