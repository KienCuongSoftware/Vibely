import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack, IoPricetagOutline } from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LiveDeviceSelects } from '@/features/live/components/host/LiveDeviceSelects.jsx'
import { LiveHostControls } from '@/features/live/components/host/LiveHostControls.jsx'
import { LiveHostMediaStatus } from '@/features/live/components/host/LiveHostMediaStatus.jsx'
import { LiveHostPreview } from '@/features/live/components/host/LiveHostPreview.jsx'
import { LiveSidebar } from '@/features/live/components/LiveSidebar.jsx'
import { LIVE_LIMITS, LIVE_PATHS, LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { useGoLive } from '@/features/live/hooks/useGoLive.js'
import { useHostMedia } from '@/features/live/hooks/useLiveHost.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'
import { captureVideoFrame } from '@/features/live/utils/captureVideoFrame.js'

/**
 * Go LIVE: camera/mic preview and a single "Go LIVE" action. The title is optional and the
 * category is assigned by the backend (same classifier as Explore).
 */
export function CreateLivePage() {
  const { t } = useTranslation()
  const { token, user, logout } = useAuth()
  const { navigate, openLive, back } = useLiveNavigation()
  const media = useHostMedia({ token, previewOnly: true })
  const videoRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const hostName = user?.displayName || user?.fullName || user?.username || ''
  const defaultTitle = hostName
    ? t('livePage.create.defaultTitle', { name: hostName })
    : t('livePage.create.defaultTitleAnonymous')
  const getCoverFrame = useCallback(() => captureVideoFrame(videoRef.current), [])
  const goLive = useGoLive({ token, media, defaultTitle, getCoverFrame })
  const capturePending = media.state.status === 'idle' || media.state.status === 'preparing'

  useEffect(() => {
    document.title = t('livePage.create.pageTitle')
  }, [t])

  const handleGoLive = async () => {
    const live = await goLive.goLive()
    if (live?.id) navigate(LIVE_PATHS.host(live.id), { replace: true })
  }

  return (
    <section className="vibely-live-page flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:flex">
        <LiveSidebar
          activeNav="goLive"
          onSelectLive={openLive}
          onGoLive={() => {}}
          token={token}
          onLogout={token ? logout : undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="live-mobile-header flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 lg:px-6">
          <button
            type="button"
            onClick={back}
            aria-label={t('nav.back')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-100 transition hover:bg-white/10"
          >
            <IoArrowBack className="text-xl" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold">{t('livePage.create.title')}</h1>
        </header>

        {/* Camera surface and controls stay dark in the light theme too, like the studio. */}
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-white">
          <div className="flex min-h-0 flex-1 items-center justify-center p-3 lg:p-6">
            <div className="vibely-keep-dark relative aspect-[9/16] h-full max-h-full max-w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
              <LiveHostPreview
                live={null}
                videoRef={videoRef}
                previewStream={media.state.previewStream}
                cameraEnabled={media.state.cameraEnabled}
                mediaKind={media.kind}
                mediaStatus={media.state.status}
                mediaError={media.state.error}
              />
              <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent p-3">
                <label htmlFor="live-create-title" className="sr-only">
                  {t('livePage.create.titleLabel')}
                </label>
                <input
                  id="live-create-title"
                  type="text"
                  value={goLive.title}
                  maxLength={LIVE_LIMITS.TITLE_MAX}
                  onChange={(event) => goLive.setTitle(event.target.value)}
                  placeholder={t('livePage.create.titlePlaceholder')}
                  className="h-10 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-[14px] font-semibold text-white placeholder:text-zinc-300 backdrop-blur focus:border-[#fe2c55] focus:outline-none"
                />
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-zinc-200 drop-shadow">
                  <IoPricetagOutline className="mt-px shrink-0" aria-hidden />
                  {t('livePage.create.autoCategoryHint')}
                </p>
              </div>
            </div>
          </div>

          <footer className="shrink-0 px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6">
            <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
              {capturePending ? (
                <p className="text-center text-[12px] text-zinc-400">{t('livePage.create.permissionHint')}</p>
              ) : null}
              <LiveHostMediaStatus state={media.state} isLive={false} onRetry={() => void media.retry()} />
              {goLive.error ? (
                <p className="rounded-lg bg-[#fe2c55]/15 px-3 py-2 text-[12px] text-[#fe2c55]" role="alert">
                  {goLive.error.message || t('livePage.create.errors.submitFailed')}
                </p>
              ) : null}
              {settingsOpen ? (
                <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2">
                  <LiveDeviceSelects media={media} idPrefix="live-create" />
                </div>
              ) : null}
              <LiveHostControls
                status={LIVE_STATUS.SCHEDULED}
                micEnabled={media.state.micEnabled}
                cameraEnabled={media.state.cameraEnabled}
                mediaReady={Boolean(media.state.previewStream)}
                onToggleMic={() => media.setMicEnabled(!media.state.micEnabled)}
                onToggleCamera={() => media.setCameraEnabled(!media.state.cameraEnabled)}
                onOpenSettings={() => setSettingsOpen((open) => !open)}
                settingsOpen={settingsOpen}
                onStart={handleGoLive}
                onEnd={() => {}}
                action={goLive.busy ? 'start' : null}
              />
            </div>
          </footer>
        </div>
      </div>
    </section>
  )
}
