import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack, IoClose, IoVolumeHighOutline, IoVolumeMuteOutline } from 'react-icons/io5'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { LiveStateView } from '@/features/live/components/LiveStateView.jsx'
import { LivePlayer } from '@/features/live/components/player/LivePlayer.jsx'
import { LiveActionBar } from '@/features/live/components/room/LiveActionBar.jsx'
import { LiveChat } from '@/features/live/components/room/LiveChat.jsx'
import { LiveGiftPanel } from '@/features/live/components/room/LiveGiftPanel.jsx'
import { LiveHostInfo } from '@/features/live/components/room/LiveHostInfo.jsx'
import { LiveViewerCount } from '@/features/live/components/room/LiveViewerCount.jsx'
import {
  getLiveCategoryLabelKey,
  LIVE_PATHS,
  LIVE_ROOM_EVENT,
  LIVE_STATUS,
} from '@/features/live/constants/liveConstants.js'
import { useLiveChat } from '@/features/live/hooks/useLiveChat.js'
import { useLiveDetail } from '@/features/live/hooks/useLiveData.js'
import {
  useLiveAuthGate,
  useLiveFollow,
  useLiveGifts,
  useLiveLikes,
  useLiveShare,
  useLiveViewerCount,
} from '@/features/live/hooks/useLiveInteractions.js'
import { useLiveMobileLayout } from '@/features/live/hooks/useLiveMobileLayout.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'
import { RESOURCE_STATUS } from '@/features/live/hooks/useLiveResource.js'
import { useLiveRoom } from '@/features/live/hooks/useLiveRoom.js'

function RoomIconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
    >
      {children}
    </button>
  )
}

/** All interactive room state; rendered only once metadata is loaded. */
function LiveRoom({ live, token, user, isMobile, onBack, onOpenHost, onStatusChange }) {
  const { t } = useTranslation()
  const requireAuth = useLiveAuthGate()
  const isEnded = live.status === LIVE_STATUS.ENDED

  const room = useLiveRoom({ liveId: live.id, token, enabled: !isEnded, initialViewerCount: live.viewerCount })
  const viewerCount = useLiveViewerCount({ room, initialCount: live.viewerCount })
  const chat = useLiveChat({ room, user })
  const likes = useLiveLikes({ liveId: live.id, token, room, initialCount: live.likeCount })
  const follow = useLiveFollow({ hostId: live.host?.id, token, initialFollowing: live.host?.followedByViewer })
  const gifts = useLiveGifts({ liveId: live.id, token })
  const { share, copied } = useLiveShare({ liveId: live.id, title: live.title })
  const [giftOpen, setGiftOpen] = useState(false)
  const [muted, setMuted] = useState(true)
  const [streamSignal, setStreamSignal] = useState(null)

  useEffect(
    () =>
      room.subscribe(LIVE_ROOM_EVENT.STATUS, (payload) => {
        if (payload?.status) onStatusChange(payload.status, payload.reason)
      }),
    [room.subscribe, onStatusChange],
  )

  useEffect(
    () =>
      room.subscribe(LIVE_ROOM_EVENT.STREAM, (payload) => {
        if (typeof payload?.publishing === 'boolean') setStreamSignal({ publishing: payload.publishing })
      }),
    [room.subscribe],
  )

  const commentsEnabled = Boolean(live.settings?.allowComments) && !isEnded
  const giftsEnabled = Boolean(live.settings?.allowGifts) && !isEnded
  const categoryLabel = t(getLiveCategoryLabelKey(live.categoryId))

  const handleLike = () => {
    if (!isEnded && requireAuth()) likes.like()
  }
  const handleFollow = () => {
    if (requireAuth()) void follow.toggle()
  }
  const handleGift = () => {
    if (giftsEnabled && requireAuth()) setGiftOpen(true)
  }
  const closeGifts = useCallback(() => setGiftOpen(false), [])

  const hostInfo = (overlay) => (
    <LiveHostInfo
      host={live.host}
      subtitle={overlay ? undefined : categoryLabel}
      following={follow.following}
      followBusy={follow.busy}
      onToggleFollow={handleFollow}
      showFollow={!live.isOwner}
      overlay={overlay}
    />
  )

  const actionBar = (vertical) => (
    <LiveActionBar
      likeCount={likes.likeCount}
      bursts={likes.bursts}
      onLike={handleLike}
      onBurstDone={likes.removeBurst}
      onShare={share}
      shareCopied={copied}
      onGift={handleGift}
      giftsEnabled={giftsEnabled}
      vertical={vertical}
    />
  )

  const chatView = (overlay, className) => (
    <LiveChat
      messages={chat.messages}
      status={chat.status}
      onSend={chat.sendComment}
      onRetry={chat.retryComment}
      onRequireAuth={requireAuth}
      commentsEnabled={commentsEnabled}
      overlay={overlay}
      className={className}
    />
  )

  const giftPanel = (
    <LiveGiftPanel
      open={giftOpen}
      onClose={closeGifts}
      catalog={gifts.catalog}
      onLoad={gifts.loadCatalog}
      onSend={gifts.sendGift}
      sendingId={gifts.sendingId}
      lastSent={gifts.lastSent}
    />
  )

  const muteButton = (
    <RoomIconButton label={muted ? t('livePage.unmute') : t('livePage.mute')} onClick={() => setMuted((value) => !value)}>
      {muted ? <IoVolumeMuteOutline className="text-lg" aria-hidden /> : <IoVolumeHighOutline className="text-lg" aria-hidden />}
    </RoomIconButton>
  )

  if (isMobile) {
    return (
      <section className="vibely-keep-dark live-room-mobile relative h-dvh max-h-dvh overflow-hidden bg-black text-white">
        <LivePlayer live={live} muted={muted} streamSignal={streamSignal} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-black/85 via-black/40 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="min-w-0 max-w-[60%]">{hostInfo(true)}</div>
          <div className="ml-auto flex items-center gap-2">
            <LiveViewerCount count={viewerCount} compact />
            {muteButton}
            <RoomIconButton label={t('common.close')} onClick={onBack}>
              <IoClose className="text-xl" aria-hidden />
            </RoomIconButton>
          </div>
        </header>

        <div className="absolute left-3 right-3 top-[calc(max(12px,env(safe-area-inset-top))+56px)] z-10 flex items-center gap-2">
          <LiveBadge />
          <span className="rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm">{categoryLabel}</span>
        </div>

        <div className="absolute bottom-[calc(max(12px,env(safe-area-inset-bottom))+64px)] right-3 z-10">
          {actionBar(true)}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pr-[72px]">
          <p className="mb-1 line-clamp-2 text-[14px] font-semibold drop-shadow">{live.title}</p>
          {chatView(true, 'h-[34dvh]')}
        </div>

        {giftPanel}
      </section>
    )
  }

  return (
    <section className="vibely-keep-dark live-room-desktop flex h-dvh max-h-dvh min-h-0 bg-black text-white">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-6 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('nav.back')}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/10"
          >
            <IoArrowBack className="text-xl" aria-hidden />
          </button>
          <div className="min-w-0 max-w-md flex-1">{hostInfo(false)}</div>
          <div className="ml-auto flex items-center gap-3">
            <LiveViewerCount count={viewerCount} />
            {live.isOwner ? (
              <button
                type="button"
                onClick={onOpenHost}
                className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold hover:bg-white/15"
              >
                {t('livePage.room.openHostControls')}
              </button>
            ) : null}
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
            <LivePlayer live={live} muted={muted} streamSignal={streamSignal} className="absolute inset-0" />
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <LiveBadge />
            </div>
            <div className="absolute bottom-3 right-3">{muteButton}</div>
            {giftPanel}
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-4 border-t border-white/10 px-6 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-bold">{live.title}</h1>
            <p className="truncate text-[12px] text-zinc-400">{categoryLabel}</p>
          </div>
          {actionBar(false)}
        </footer>
      </main>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/10">
        <h2 className="shrink-0 border-b border-white/10 px-4 py-3 text-[15px] font-bold">{t('livePage.chat.title')}</h2>
        {chatView(false, 'min-h-0 flex-1')}
      </aside>
    </section>
  )
}

export function LiveDetailPage() {
  const { t } = useTranslation()
  const { liveId } = useParams()
  const { token, user } = useAuth()
  const { navigate, back } = useLiveNavigation()
  const isMobile = useLiveMobileLayout()
  const detail = useLiveDetail({ liveId, token })
  const live = detail.data
  const { setData } = detail
  const handleStatusChange = useCallback(
    (status, reason) =>
      setData((prev) =>
        prev && prev.status !== status ? { ...prev, status, endReason: reason ?? prev.endReason ?? null } : prev,
      ),
    [setData],
  )

  useEffect(() => {
    document.title = live?.title
      ? t('livePage.room.pageTitle', { title: live.title })
      : t('livePage.nav.exploreLive')
  }, [live?.title, t])

  if (detail.status === RESOURCE_STATUS.LOADING && !live) {
    return (
      <div className="vibely-keep-dark flex h-dvh items-center justify-center bg-black">
        <LiveStateView variant="loading" />
      </div>
    )
  }

  if (detail.status === RESOURCE_STATUS.ERROR || !live) {
    const notFound = detail.error?.status === 404
    return (
      <div className="vibely-keep-dark flex h-dvh items-center justify-center bg-black text-white">
        <LiveStateView
          variant="error"
          title={notFound ? t('livePage.states.notFoundTitle') : undefined}
          description={notFound ? t('livePage.states.notFoundDescription') : t('livePage.states.roomError')}
          actionLabel={notFound ? t('livePage.states.backToDiscovery') : undefined}
          onAction={notFound ? () => navigate(LIVE_PATHS.discovery) : detail.reload}
        />
      </div>
    )
  }

  return (
    <LiveRoom
      live={live}
      token={token}
      user={user}
      isMobile={isMobile}
      onBack={back}
      onOpenHost={() => navigate(LIVE_PATHS.host(live.id))}
      onStatusChange={handleStatusChange}
    />
  )
}
