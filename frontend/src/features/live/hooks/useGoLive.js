import { useCallback, useRef, useState } from 'react'
import { LIVE_LIMITS } from '@/features/live/constants/liveConstants.js'
import { rememberHostMediaPreferences } from '@/features/live/media/hostMediaPreferences.js'
import { liveService } from '@/features/live/services/liveService.js'

/**
 * One-tap Go LIVE from the camera preview: camera/mic must be granted, then the LIVE is
 * created (title optional, category classified by the backend, the host's avatar is the
 * cover) and started. If starting fails, the next tap retries the same LIVE instead of
 * creating another one.
 */
export function useGoLive({ token, media, defaultTitle }) {
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
      let created = createdRef.current
      if (!created) {
        const finalTitle = title.trim().slice(0, LIVE_LIMITS.TITLE_MAX) || defaultTitle
        created = await liveService.createLive({ title: finalTitle }, token)
        createdRef.current = created
      }
      rememberHostMediaPreferences(created.id, media.getState())
      return await liveService.startLive(created.id, token)
    } catch (err) {
      setError(err)
      return null
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [defaultTitle, media, title, token])

  return { title, setTitle, goLive, busy, error }
}
