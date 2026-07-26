import { useCallback, useState } from 'react'
import {
  readStoredFeedPlaybackSpeed,
  writeStoredFeedPlaybackSpeed,
} from '@/features/feed/utils/feedPlaybackSpeedStorage.js'

export function usePersistedFeedPlaybackSpeed() {
  const [feedPlaybackSpeed, setFeedPlaybackSpeedState] = useState(
    readStoredFeedPlaybackSpeed,
  )

  const setFeedPlaybackSpeed = useCallback((rate) => {
    setFeedPlaybackSpeedState(rate)
    writeStoredFeedPlaybackSpeed(rate)
  }, [])

  return [feedPlaybackSpeed, setFeedPlaybackSpeed]
}
