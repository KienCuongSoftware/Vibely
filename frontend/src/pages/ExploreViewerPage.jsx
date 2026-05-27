import React from 'react'
import { VideoWatchPage } from './VideoWatchPage.jsx'

/**
 * Dedicated immersive explore route. We reuse watch playback primitives
 * so interactions remain consistent with the main feed/watch stack.
 */
export function ExploreViewerPage() {
  return <VideoWatchPage />
}
