import { useCallback, useRef, useState } from 'react'
import { LIVE_LIMITS } from '@/features/live/constants/liveConstants.js'
import { rememberHostMediaPreferences } from '@/features/live/media/hostMediaPreferences.js'
import { liveService } from '@/features/live/services/liveService.js'

/**
 * One-tap Go LIVE from the camera preview: camera/mic must be granted, then the LIVE is
 * created (title optional, category classified by the backend, cover = current preview
 * frame) and started. If starting fails, the next tap retries the same LIVE instead of
 * creating another one.
 */
export function useGoLive({ token, media, defaultTitle, getCoverFrame }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const busyRef = useRef(false)
  const createdRef = useRef(null)

  /** @returns {Promise<import('../api/liveContracts.js').LiveDetail|null>} the started LIVE */
  const goLive = useCallback(async () => {
    if (busyRef.current) return null
    if (media.getState().status !== 'ready') await media.prepare()
    if (media.getState().status !== 'ready') return null

    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const mediaState = media.getState()
      let created = createdRef.current
      if (!created) {
        const coverFile = mediaState.cameraEnabled && getCoverFrame ? await getCoverFrame() : null
        const finalTitle = title.trim().slice(0, LIVE_LIMITS.TITLE_MAX) || defaultTitle
        created = await liveService.createLive({ title: finalTitle, coverFile }, token)
        createdRef.current = created
      }
      rememberHostMediaPreferences(created.id, mediaState)
      return await liveService.startLive(created.id, token)
    } catch (err) {
      setError(err)
      return null
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [defaultTitle, getCoverFrame, media, title, token])

  return { title, setTitle, goLive, busy, error }
}
