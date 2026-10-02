import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack, IoHeart, IoTimeOutline } from 'react-icons/io5'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LiveToggle } from '@/features/live/components/create/LiveFormControls.jsx'
import { LiveHostControls } from '@/features/live/components/host/LiveHostControls.jsx'
import { LiveHostMediaStatus } from '@/features/live/components/host/LiveHostMediaStatus.jsx'
import { LiveHostPreview } from '@/features/live/components/host/LiveHostPreview.jsx'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { LiveStateView } from '@/features/live/components/LiveStateView.jsx'
import { LiveChat } from '@/features/live/components/room/LiveChat.jsx'
import { LiveViewerCount } from '@/features/live/components/room/LiveViewerCount.jsx'
import { LIVE_PATHS, LIVE_ROOM_EVENT, LIVE_STATUS } from '@/features/live/constants/liveConstants.js'
import { useLiveChat } from '@/features/live/hooks/useLiveChat.js'
import { useLiveDetail } from '@/features/live/hooks/useLiveData.js'
import { useHostMedia, useLiveHostSession } from '@/features/live/hooks/useLiveHost.js'
import { useLiveViewerCount } from '@/features/live/hooks/useLiveInteractions.js'
import { useLiveMobileLayout } from '@/features/live/hooks/useLiveMobileLayout.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'
import { RESOURCE_STATUS } from '@/features/live/hooks/useLiveResource.js'
import { useLiveRoom } from '@/features/live/hooks/useLiveRoom.js'
import { endReasonMessageKey } from '@/features/live/media/mediaErrorMessages.js'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'
import { formatLiveDuration } from '@/features/live/utils/formatLiveDuration.js'

const STATUS_LABEL_KEYS = {
  [LIVE_STATUS.SCHEDULED]: 'livePage.host.status.scheduled',
  [LIVE_STATUS.LIVE]: 'livePage.host.status.live',
  [LIVE_STATUS.ENDED]: 'livePage.host.status.ended',
}

function EndLiveDialog({ open, onCancel, onConfirm, busy }) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="live-end-title">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-5 text-white shadow-2xl">
        <h2 id="live-end-title" className="text-[17px] font-bold">{t('livePage.host.endConfirmTitle')}</h2>
        <p className="mt-2 text-[13px] text-zinc-400">{t('livePage.host.endConfirmBody')}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-[14px] font-semibold hover:bg-white/15">
            {t('livePage.create.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="cursor-pointer rounded-lg bg-[#fe2c55] px-4 py-2 text-[14px] font-semibold hover:bg-[#e6284c] disabled:cursor-wait disabled:opacity-70"
          >
            {t('livePage.host.endLive')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeviceSelect({ id, label, devices, value, onChange }) {
  if (!devices?.length) return null
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span className="shrink-0 text-zinc-300">{label}</span>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 max-w-[60%] cursor-pointer truncate rounded-md bg-white/10 px-2 py-1 text-[12px] text-white outline-none focus:ring-1 focus:ring-white/30"
      >
        {value ? null : <option value="" disabled>—</option>}
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId} className="bg-zinc-900">
            {device.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function HostSettingsPanel({ settings, onChange, media }) {
  const { t } = useTranslation()
  const devices = media.state.devices
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2">
      <DeviceSelect
        id="live-host-camera"
        label={t('livePage.media.devices.camera')}
        devices={devices?.videoinput}
        value={media.state.selectedDeviceIds?.videoinput}
        onChange={(deviceId) => void media.switchDevice('videoinput', deviceId)}
      />
      <DeviceSelect
        id="live-host-microphone"
        label={t('livePage.media.devices.microphone')}
        devices={devices?.audioinput}
        value={media.state.selectedDeviceIds?.audioinput}
        onChange={(deviceId) => void media.switchDevice('audioinput', deviceId)}
      />
      <LiveToggle
        id="live-host-allow-comments"
        label={t('livePage.create.allowComments')}
        checked={settings.allowComments}
        onChange={(checked) => onChange({ allowComments: checked })}
      />
      <LiveToggle
        id="live-host-allow-gifts"
        label={t('livePage.create.allowGifts')}
        checked={settings.allowGifts}
        onChange={(checked) => onChange({ allowGifts: checked })}
      />
      <p className="pb-2 text-[11px] text-zinc-500">{t('livePage.host.settingsSessionNote')}</p>
    </div>
  )
}

function LiveHostStudio({ live, setLive, token, user, isMobile, onBack, onExit }) {
  const { t } = useTranslation()
  const media = useHostMedia({ liveId: live.id, token, playbackType: live.playback?.type })
  const session = useLiveHostSession({ live, setLive, token, media })
  const isLive = live.status === LIVE_STATUS.LIVE
  const isEnded = live.status === LIVE_STATUS.ENDED

  const room = useLiveRoom({ liveId: live.id, token, enabled: isLive, initialViewerCount: live.viewerCount })
  const viewerCount = useLiveViewerCount({ room, initialCount: live.viewerCount })
  const chat = useLiveChat({ room, user })

  // The LIVE can also be ended by the system (host connection lost too long) or a moderator.
  useEffect(
    () =>
      room.subscribe(LIVE_ROOM_EVENT.STATUS, (payload) => {
        if (!payload?.status) return
        setLive((prev) =>
          prev && prev.status !== payload.status
            ? { ...prev, status: payload.status, endReason: payload.reason ?? prev.endReason ?? null }
            : prev,
        )
      }),
    [room.subscribe, setLive],
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(() => ({
    allowComments: Boolean(live.settings?.allowComments),
    allowGifts: Boolean(live.settings?.allowGifts),
  }))
  const [confirmEnd, setConfirmEnd] = useState(false)

  const statusPill = (
    <div className="flex items-center gap-2">
      {isLive ? <LiveBadge /> : (
        <span className="rounded-sm bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase">
          {t(STATUS_LABEL_KEYS[live.status] ?? STATUS_LABEL_KEYS[LIVE_STATUS.SCHEDULED])}
        </span>
      )}
      {isLive ? (
        <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-zinc-300">
          <IoTimeOutline aria-hidden />
          {formatLiveDuration(session.elapsedMs)}
        </span>
      ) : null}
    </div>
  )

  const controls = (
    <LiveHostControls
      status={live.status}
      micEnabled={media.state.micEnabled}
      cameraEnabled={media.state.cameraEnabled}
      mediaReady={media.ready && (!media.requiresCapture || Boolean(media.state.previewStream))}
      onToggleMic={() => media.setMicEnabled(!media.state.micEnabled)}
      onToggleCamera={() => media.setCameraEnabled(!media.state.cameraEnabled)}
      onOpenSettings={() => setSettingsOpen((open) => !open)}
      settingsOpen={settingsOpen}
      onStart={session.start}
      onEnd={() => setConfirmEnd(true)}
      action={session.action}
    />
  )

  const chatView = (overlay, className) => (
    <LiveChat
      messages={chat.messages}
      status={isLive ? chat.status : 'ready'}
      onSend={chat.sendComment}
      onRetry={chat.retryComment}
      onRequireAuth={() => true}
      commentsEnabled={isLive && settings.allowComments}
      overlay={overlay}
      className={className}
    />
  )

  const endedSummary = isEnded ? (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-6">
      <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-5 text-center">
        <h2 className="text-[17px] font-bold">{t('livePage.host.endedTitle')}</h2>
        {endReasonMessageKey(live.endReason) ? (
          <p className="mt-2 text-[12px] text-zinc-400">{t(endReasonMessageKey(live.endReason))}</p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg bg-white/5 p-3">
            <dt className="text-[11px] text-zinc-400">{t('livePage.host.summaryViewers')}</dt>
            <dd className="text-[17px] font-bold tabular-nums">{formatLiveViewerCount(viewerCount)}</dd>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <dt className="text-[11px] text-zinc-400">{t('livePage.host.summaryLikes')}</dt>
            <dd className="inline-flex items-center gap-1 text-[17px] font-bold tabular-nums">
              <IoHeart className="text-[#fe2c55]" aria-hidden />
              {formatLiveViewerCount(live.likeCount)}
            </dd>
          </div>
        </dl>
        <button type="button" onClick={onExit} className="mt-5 w-full cursor-pointer rounded-lg bg-[#fe2c55] py-2.5 text-[14px] font-semibold hover:bg-[#e6284c]">
          {t('livePage.states.backToDiscovery')}
        </button>
      </div>
    </div>
  ) : null

  const errorBanner = (
    <>
      {session.error ? (
        <p className="rounded-lg bg-[#fe2c55]/15 px-3 py-2 text-[12px] text-[#fe2c55]" role="alert">
          {session.error.message || t('livePage.host.actionFailed')}
        </p>
      ) : null}
      {isEnded ? null : <LiveHostMediaStatus state={media.state} isLive={isLive} onRetry={() => void media.retry()} />}
    </>
  )

  const preview = (
    <LiveHostPreview
      live={live}
      previewStream={media.state.previewStream}
      cameraEnabled={media.state.cameraEnabled}
      mediaKind={media.kind}
      mediaStatus={media.state.status}
      mediaError={media.state.error}
    />
  )
  const settingsPanel = settingsOpen ? (
    <HostSettingsPanel settings={settings} media={media} onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))} />
  ) : null

  const dialog = (
    <EndLiveDialog
      open={confirmEnd}
      busy={session.action === 'end'}
      onCancel={() => setConfirmEnd(false)}
      onConfirm={async () => {
        await session.end()
        setConfirmEnd(false)
      }}
    />
  )

  const header = (
    <header className="flex shrink-0 items-center gap-3 px-3 py-3 lg:border-b lg:border-white/10 lg:px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('nav.back')}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/35 transition hover:bg-white/10 lg:bg-transparent"
      >
        <IoArrowBack className="text-xl" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-bold drop-shadow">{live.title}</h1>
        {statusPill}
      </div>
      <LiveViewerCount count={viewerCount} compact={isMobile} />
    </header>
  )

  if (isMobile) {
    return (
      <section className="vibely-keep-dark relative h-dvh max-h-dvh overflow-hidden bg-black text-white">
        <div className="absolute inset-0">{preview}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/85 to-transparent" />
        <div className="relative z-10 flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[max(12px,env(safe-area-inset-bottom))]">
          {header}
          <div className="mt-auto flex flex-col gap-3 px-3">
            {errorBanner}
            {settingsPanel}
            {isLive ? chatView(true, 'h-[30dvh]') : null}
            {controls}
          </div>
        </div>
        {endedSummary}
        {dialog}
      </section>
    )
  }

  return (
    <section className="vibely-keep-dark flex h-dvh max-h-dvh min-h-0 bg-black text-white">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
            {preview}
            {endedSummary}
          </div>
        </div>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-6 py-3">
          {errorBanner}
          {settingsPanel}
          {controls}
        </footer>
      </main>
      <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/10">
        <h2 className="shrink-0 border-b border-white/10 px-4 py-3 text-[15px] font-bold">{t('livePage.chat.title')}</h2>
        {isLive ? (
          chatView(false, 'min-h-0 flex-1')
        ) : (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-zinc-500">
            {isEnded ? t('livePage.host.chatEnded') : t('livePage.host.chatBeforeStart')}
          </p>
        )}
      </aside>
      {dialog}
    </section>
  )
}

export function LiveHostPage() {
  const { t } = useTranslation()
  const { liveId } = useParams()
  const { token, user } = useAuth()
  const { navigate, back } = useLiveNavigation()
  const isMobile = useLiveMobileLayout()
  const detail = useLiveDetail({ liveId, token })
  const live = detail.data

  useEffect(() => {
    document.title = t('livePage.host.pageTitle')
  }, [t])

  if (detail.status === RESOURCE_STATUS.LOADING && !live) {
    return (
      <div className="vibely-keep-dark flex h-dvh items-center justify-center bg-black">
        <LiveStateView variant="loading" />
      </div>
    )
  }

  if (detail.status === RESOURCE_STATUS.ERROR || !live || !live.isOwner) {
    const forbidden = live && !live.isOwner
    return (
      <div className="vibely-keep-dark flex h-dvh items-center justify-center bg-black text-white">
        <LiveStateView
          variant="error"
          title={forbidden ? t('livePage.host.notOwnerTitle') : undefined}
          description={forbidden ? t('livePage.host.notOwnerDescription') : t('livePage.states.roomError')}
          actionLabel={forbidden || detail.error?.status === 404 ? t('livePage.states.backToDiscovery') : undefined}
          onAction={forbidden || detail.error?.status === 404 ? () => navigate(LIVE_PATHS.discovery) : detail.reload}
        />
      </div>
    )
  }

  return (
    <LiveHostStudio
      live={live}
      setLive={detail.setData}
      token={token}
      user={user}
      isMobile={isMobile}
      onBack={back}
      onExit={() => navigate(LIVE_PATHS.discovery)}
    />
  )
}
