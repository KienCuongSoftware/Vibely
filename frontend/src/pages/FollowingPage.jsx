import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../state/useAuth'
import { SuggestedCreatorsPanel } from '../components/SuggestedCreatorsPanel.jsx'
import { VerticalVideoFeed } from '../components/feed/VerticalVideoFeed.jsx'
import {
  CreatorGridShell,
  GridLoadingState,
  GridLoginPrompt,
} from '../components/feed/CreatorGridShell.jsx'
import { useSuggestedCreatorFollow } from '../hooks/useSuggestedCreatorFollow.js'
import {
  clearFollowingPreferFeedFromSidebar,
  peekFollowingPreferFeedFromSidebar,
  resolveFollowingViewMode,
} from '../utils/followingPageView.js'

const PAGE_TITLE = 'Đang follow | Vibely'

/** null = đang xác định; grid = lưới; feed = video (sidebar quay lại / F5 khi đã có video từ người follow). */
export function FollowingPage() {
  const { token, user, logout, authReady } = useAuth()
  const location = useLocation()
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
  }, [authReady, token, location.key])

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
    return (
      <VerticalVideoFeed
        token={token}
        user={user}
        onLogout={logout}
        authReady={authReady}
        feedMode="following"
        activeMenuId="following"
      />
    )
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
