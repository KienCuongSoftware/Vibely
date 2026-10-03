import React from 'react'
import { LIVE_PLAYBACK_TYPE, LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { MockLivePlayer } from '@/features/live/components/player/MockLivePlayer.jsx'
import { WebRtcLivePlayer } from '@/features/live/components/player/WebRtcLivePlayer.jsx'

/**
 * Playback implementations keyed by `live.playback.type`; pages keep rendering
 * <LivePlayer /> unchanged. Without a media server the backend sends no type and the
 * cover-based mock is used.
 *
 * Every implementation receives `{ live, muted, ended, streamSignal, onEnded, showQuality }`, fills its
 * parent and must release its media resources on unmount. `onEnded` fires when playback learns the LIVE
 * is over; `showQuality` (room page only, not previews) shows the connection quality badge.
 */
const PLAYER_BY_PLAYBACK_TYPE = {
  [LIVE_PLAYBACK_TYPE.WEBRTC]: WebRtcLivePlayer,
}

export function resolveLivePlayer(playbackType) {
  return PLAYER_BY_PLAYBACK_TYPE[playbackType] ?? MockLivePlayer
}

export function LivePlayer({ live, muted = true, className = '', streamSignal = null, onEnded = null, showQuality = false }) {
  const Player = resolveLivePlayer(live?.playback?.type)
  return (
    <div className={className}>
      <Player
        live={live}
        muted={muted}
        ended={live?.status === LIVE_STATUS.ENDED}
        streamSignal={streamSignal}
        onEnded={onEnded}
        showQuality={showQuality}
      />
    </div>
  )
}
