import React, { useEffect, useState } from 'react'
import { IoPeople } from 'react-icons/io5'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import { SuggestedCreatorsPanel } from '../components/SuggestedCreatorsPanel.jsx'
import {
  CreatorGridShell,
  GridLoadingState,
  GridLoginPrompt,
} from '../components/feed/CreatorGridShell.jsx'
import { useSuggestedCreatorFollow } from '../hooks/useSuggestedCreatorFollow.js'
import { FEED_STAGE_OUTER_WIDTH_CLASS } from '../components/feed/FeedPhoneStage'

const PAGE_TITLE = 'Bạn bè | Vibely'

export function FriendsPage() {
  const { token, user, logout, authReady } = useAuth()
  const [friendCount, setFriendCount] = useState(null)
  const [hydrated, setHydrated] = useState(false)
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

    let isMounted = true
    setHydrated(false)
    setFriendCount(null)

    if (!token) {
      setHydrated(true)
      return undefined
    }

    ;(async () => {
      try {
        const friends = await apiClient.getMentionableFriends(token)
        if (!isMounted) return
        setFriendCount(Array.isArray(friends) ? friends.length : 0)
      } catch {
        if (!isMounted) return
        setFriendCount(0)
      } finally {
        if (isMounted) setHydrated(true)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [authReady, token])

  const showSuggestions = hydrated && friendCount === 0

  return (
    <CreatorGridShell
      activeMenu="friends"
      token={token}
      user={user}
      onLogout={logout}
    >
      {!token ? (
        <GridLoginPrompt
          title="Đăng nhập để xem Bạn bè"
          description="Kết nối với người bạn follow lẫn nhau trên Vibely."
        />
      ) : !hydrated ? (
        <GridLoadingState />
      ) : showSuggestions ? (
        <SuggestedCreatorsPanel
          token={token}
          onCreatorFollowed={handleCreatorFollowed}
          onCreatorUnfollowed={handleCreatorUnfollowed}
          onMetaLoaded={handleCreatorsMeta}
        />
      ) : (
        <div
          className={`relative mx-auto flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 py-16 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
        >
          <IoPeople className="mb-4 h-14 w-14 text-zinc-600" aria-hidden />
          <p className="text-lg font-semibold text-zinc-100">
            Bạn có {friendCount} bạn bè
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Video từ bạn bè (người bạn follow lẫn nhau) sẽ hiển thị tại đây.
          </p>
        </div>
      )}
    </CreatorGridShell>
  )
}

export default FriendsPage
