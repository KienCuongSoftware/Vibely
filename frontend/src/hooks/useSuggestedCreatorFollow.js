import { useCallback, useState } from 'react'
import {
  readFeedFollowedAuthorIds,
  writeFeedFollowedAuthorIds,
} from '../utils/feedFollowState.js'

export function useSuggestedCreatorFollow(token) {
  const [viewerFollowingCount, setViewerFollowingCount] = useState(null)

  const markAuthorFollowedInSession = useCallback(
    (authorId) => {
      const key = Number(authorId)
      if (!token || !Number.isFinite(key) || key <= 0) return
      const next = readFeedFollowedAuthorIds(token)
      next.add(key)
      writeFeedFollowedAuthorIds(token, next)
    },
    [token],
  )

  const markAuthorUnfollowedInSession = useCallback(
    (authorId) => {
      const key = Number(authorId)
      if (!token || !Number.isFinite(key) || key <= 0) return
      const next = readFeedFollowedAuthorIds(token)
      next.delete(key)
      writeFeedFollowedAuthorIds(token, next)
    },
    [token],
  )

  const handleCreatorFollowed = useCallback(
    (userId) => {
      if (!token) return
      markAuthorFollowedInSession(userId)
      setViewerFollowingCount((count) =>
        typeof count === 'number' ? count + 1 : 1,
      )
    },
    [markAuthorFollowedInSession, token],
  )

  const handleCreatorUnfollowed = useCallback(
    (userId) => {
      if (!token) return
      markAuthorUnfollowedInSession(userId)
      setViewerFollowingCount((count) =>
        typeof count === 'number' ? Math.max(0, count - 1) : 0,
      )
    },
    [markAuthorUnfollowedInSession, token],
  )

  const handleCreatorsMeta = useCallback((meta) => {
    setViewerFollowingCount(Number(meta?.viewerFollowingCount ?? 0))
  }, [])

  return {
    viewerFollowingCount,
    handleCreatorFollowed,
    handleCreatorUnfollowed,
    handleCreatorsMeta,
  }
}
