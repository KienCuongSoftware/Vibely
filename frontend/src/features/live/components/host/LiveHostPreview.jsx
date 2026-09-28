import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IoVideocamOffOutline } from 'react-icons/io5'

/**
 * Host preview surface. Renders the controller's MediaStream when one exists;
 * until real capture is wired it shows the cover with an explanatory note.
 */
export function LiveHostPreview({ live, previewStream, cameraEnabled }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.srcObject = previewStream ?? null
    return () => {
      video.srcObject = null
    }
  }, [previewStream])

  const cover = live?.portraitCoverUrl ?? live?.coverUrl

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-zinc-950">
      {previewStream && cameraEnabled ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <>
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" referrerPolicy="no-referrer" />
          ) : null}
          <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <IoVideocamOffOutline className="text-4xl text-zinc-400" aria-hidden />
            <p className="text-[14px] font-semibold text-white">
              {cameraEnabled ? t('livePage.host.previewUnavailable') : t('livePage.host.cameraOff')}
            </p>
            {cameraEnabled ? (
              <p className="max-w-xs text-[12px] text-zinc-400">{t('livePage.host.previewUnavailableHint')}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
