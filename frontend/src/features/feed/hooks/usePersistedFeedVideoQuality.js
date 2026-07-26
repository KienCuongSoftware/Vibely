import { useCallback, useState } from 'react'
import {
  readStoredFeedVideoQuality,
  writeStoredFeedVideoQuality,
} from '@/features/feed/utils/feedVideoQualityStorage.js'

export function usePersistedFeedVideoQuality() {
  const [feedVideoQuality, setFeedVideoQualityState] = useState(
    readStoredFeedVideoQuality,
  )

  const setFeedVideoQuality = useCallback((mode) => {
    setFeedVideoQualityState(mode)
    writeStoredFeedVideoQuality(mode)
  }, [])

  return [feedVideoQuality, setFeedVideoQuality]
}
