import { useEffect } from 'react'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import {
  readUploadDraftPublicIds,
  untrackUploadDraftPublicId,
} from '../utils/uploadDraftCleanup.js'

/**
 * Best-effort cleanup of unpublished Studio upload drafts left after reload/close.
 * Mount once near the app root so it runs even if the user lands on /posts first.
 */
export function StudioUploadDraftCleanup() {
  const { token, authReady } = useAuth()

  useEffect(() => {
    if (!authReady || !token) return undefined
    const orphans = readUploadDraftPublicIds()
    if (orphans.length === 0) return undefined
    let cancelled = false
    void (async () => {
      for (const id of orphans) {
        if (cancelled) return
        try {
          await apiClient.deleteVideo(id, token)
        } catch {
          // ignore missing / already removed
        } finally {
          untrackUploadDraftPublicId(id)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, token])

  return null
}
