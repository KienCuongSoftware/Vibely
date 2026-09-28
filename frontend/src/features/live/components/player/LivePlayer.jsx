import React from 'react'
import { LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { MockLivePlayer } from '@/features/live/components/player/MockLivePlayer.jsx'

/**
 * Playback implementations keyed by `live.playback.type`. Register
 * `webrtc: WebRTCLivePlayer` (WHEP from SRS) or `hls: HlsLivePlayer` (hls.js is
 * already a dependency) here; pages keep rendering <LivePlayer /> unchanged.
 *
 * Every implementation receives `{ live, muted, ended }`, fills its parent and
 * must release its media resources on unmount.
 */
const PLAYER_BY_PLAYBACK_TYPE = {}

export function resolveLivePlayer(playbackType) {
  return PLAYER_BY_PLAYBACK_TYPE[playbackType] ?? MockLivePlayer
}

export function LivePlayer({ live, muted = true, className = '' }) {
  const Player = resolveLivePlayer(live?.playback?.type)
  return (
    <div className={className}>
      <Player live={live} muted={muted} ended={live?.status === LIVE_STATUS.ENDED} />
    </div>
  )
}
