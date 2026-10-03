import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isHlsPlaybackUrl } from '@/features/feed/utils/feedPlayback.js'
import { attachLiveHls } from '@/features/live/media/hls/liveHlsPlayback.js'

/**
 * Replay of a recorded LIVE: a regular video file or HLS playlist behind a short-lived signed URL.
 * When playback fails (typically an expired URL) `onReload` asks the page for a fresh URL.
 */
export function LiveReplayPlayer({ url, poster = null, onReload }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const [failedUrl, setFailedUrl] = useState(null)
  const failed = failedUrl === url

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return undefined
    const fail = () => setFailedUrl(url)
    if (isHlsPlaybackUrl(url)) return attachLiveHls(video, url, { onFatal: fail })
    video.addEventListener('error', fail)
    video.src = url
    return () => {
      video.removeEventListener('error', fail)
      video.removeAttribute('src')
      video.load?.()
    }
  }, [url])

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster ?? undefined}
        className="h-full w-full object-contain"
        aria-label={t('livePage.replay.title')}
      />
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
          <p className="max-w-xs text-sm font-semibold text-white">{t('livePage.replay.playbackFailed')}</p>
          <button
            type="button"
            onClick={onReload}
            className="cursor-pointer rounded-full bg-[#fe2c55] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e6284c]"
          >
            {t('livePage.media.retry')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
