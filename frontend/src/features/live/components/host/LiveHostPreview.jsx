import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IoVideocamOffOutline } from 'react-icons/io5'
import { mediaErrorMessageKey } from '@/features/live/media/mediaErrorMessages.js'

function placeholderKeys({ cameraEnabled, mediaKind, mediaStatus, mediaError }) {
  if (!cameraEnabled) return { title: 'livePage.host.cameraOff', hint: null }
  if (mediaKind !== 'webrtc') {
    return { title: 'livePage.host.previewUnavailable', hint: 'livePage.host.previewUnavailableHint' }
  }
  if (mediaStatus === 'preparing' || mediaStatus === 'idle') {
    return { title: 'livePage.media.host.requestingAccess', hint: null }
  }
  return {
    title: 'livePage.media.host.previewUnavailable',
    hint: mediaError?.stage === 'capture' ? mediaErrorMessageKey(mediaError.code) : null,
  }
}

/**
 * Host preview surface. Renders the controller's MediaStream (local, muted) when one
 * exists; otherwise the cover with the reason the camera is not showing.
 */
export function LiveHostPreview({ live, previewStream, cameraEnabled, mediaKind = null, mediaStatus = 'idle', mediaError = null }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const showVideo = Boolean(previewStream) && cameraEnabled

  // The <video> unmounts while the camera is off, so the stream is re-attached when it comes back.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.srcObject = previewStream ?? null
    return () => {
      video.srcObject = null
    }
  }, [previewStream, showVideo])

  const cover = live?.portraitCoverUrl ?? live?.coverUrl
  const keys = placeholderKeys({ cameraEnabled, mediaKind, mediaStatus, mediaError })

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-zinc-950">
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <>
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" referrerPolicy="no-referrer" />
          ) : null}
          <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <IoVideocamOffOutline className="text-4xl text-zinc-400" aria-hidden />
            <p className="text-[14px] font-semibold text-white">{t(keys.title)}</p>
            {keys.hint ? <p className="max-w-xs text-[12px] text-zinc-400">{t(keys.hint)}</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
