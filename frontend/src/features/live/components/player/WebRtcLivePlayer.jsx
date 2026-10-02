import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoPlay, IoVolumeHighOutline } from 'react-icons/io5'
import { LiveSpinner } from '@/features/live/components/LiveStateView.jsx'
import { useWebRtcPlayback } from '@/features/live/hooks/useLivePlayback.js'
import { endReasonMessageKey, mediaErrorMessageKey } from '@/features/live/media/mediaErrorMessages.js'

const PROGRESS_KEYS = {
  idle: 'livePage.media.viewer.connecting',
  connecting: 'livePage.media.viewer.connecting',
  waiting: 'livePage.media.viewer.waiting',
  reconnecting: 'livePage.media.viewer.reconnecting',
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center">
      {children}
    </div>
  )
}

/**
 * WebRTC (WHEP) LIVE player. Same props as every LivePlayer implementation, plus the
 * optional `streamSignal` from the room channel.
 *
 * Autoplay: the stream starts muted (always allowed); unmuting comes from a user gesture.
 * If the browser still blocks playback, a tap-to-play / tap-to-unmute button is shown.
 */
export function WebRtcLivePlayer({ live, muted = true, ended = false, streamSignal = null }) {
  const { t } = useTranslation()
  const { state, retry } = useWebRtcPlayback({ liveId: live?.id, ended, streamSignal })
  const videoRef = useRef(null)
  const [blocked, setBlocked] = useState(null)
  const backdrop = live?.coverUrl ?? live?.portraitCoverUrl ?? null
  const playing = state.status === 'playing' && Boolean(state.stream)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.srcObject = state.stream ?? null
    return () => {
      video.srcObject = null
    }
  }, [state.stream])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !state.stream) return
    video.muted = muted
    const attempt = video.play?.()
    if (!attempt || typeof attempt.then !== 'function') return
    attempt
      .then(() => setBlocked(null))
      .catch((error) => {
        if (error?.name !== 'NotAllowedError') return
        if (!muted) {
          // Sound needs a gesture this browser did not count: keep the picture, ask for a tap.
          video.muted = true
          setBlocked('sound')
          video.play?.()?.catch?.(() => setBlocked('play'))
        } else {
          setBlocked('play')
        }
      })
  }, [muted, state.stream])

  const resumeFromGesture = () => {
    const video = videoRef.current
    if (!video) return
    if (blocked === 'sound') video.muted = false
    const attempt = video.play?.()
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => setBlocked(null)).catch(() => {})
    } else {
      setBlocked(null)
    }
  }

  const overlay = (() => {
    if (ended || state.status === 'ended') {
      const reasonKey = endReasonMessageKey(live?.endReason)
      return (
        <Overlay>
          <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">{t('livePage.player.ended')}</p>
          {reasonKey ? <p className="max-w-xs text-[12px] text-zinc-300">{t(reasonKey)}</p> : null}
        </Overlay>
      )
    }
    if (state.status === 'unsupported' || state.status === 'unavailable') {
      return (
        <Overlay>
          <p className="max-w-xs text-sm font-semibold text-white">{t(mediaErrorMessageKey(state.errorCode))}</p>
        </Overlay>
      )
    }
    if (state.status === 'failed') {
      return (
        <Overlay>
          <p className="max-w-xs text-sm font-semibold text-white">{t('livePage.media.viewer.failed')}</p>
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer rounded-full bg-[#fe2c55] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e6284c]"
          >
            {t('livePage.media.retry')}
          </button>
        </Overlay>
      )
    }
    if (PROGRESS_KEYS[state.status]) {
      return (
        <Overlay>
          <LiveSpinner className="h-6 w-6" />
          <p className="max-w-xs text-[13px] text-zinc-200" role="status" aria-live="polite">{t(PROGRESS_KEYS[state.status])}</p>
        </Overlay>
      )
    }
    if (playing && blocked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={resumeFromGesture}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-black/80"
          >
            {blocked === 'sound' ? <IoVolumeHighOutline aria-hidden /> : <IoPlay aria-hidden />}
            {blocked === 'sound' ? t('livePage.media.viewer.tapToUnmute') : t('livePage.media.viewer.tapToPlay')}
          </button>
        </div>
      )
    }
    return null
  })()

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-zinc-950">
      {backdrop && !playing ? (
        <img
          src={backdrop}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.35]"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`relative h-full w-full bg-black object-contain ${playing ? '' : 'invisible'}`}
      />
      {playing && state.hostReconnecting ? (
        <p className="absolute inset-x-3 top-14 mx-auto w-fit rounded-full bg-black/70 px-3 py-1 text-[12px] text-zinc-200" role="status">
          {t('livePage.media.viewer.hostReconnecting')}
        </p>
      ) : null}
      {overlay}
    </div>
  )
}
