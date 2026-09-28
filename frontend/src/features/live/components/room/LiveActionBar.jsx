import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoGiftOutline, IoHeart, IoShareSocialOutline } from 'react-icons/io5'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

function ActionButton({ label, onClick, disabled, children, caption, vertical }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`live-action-btn group relative flex cursor-pointer items-center text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
        vertical ? 'flex-col gap-1' : 'gap-2 rounded-full bg-white/10 px-3.5 py-2 hover:bg-white/15'
      }`}
    >
      <span
        className={`flex items-center justify-center ${
          vertical ? 'h-11 w-11 rounded-full bg-black/35 backdrop-blur-sm group-active:scale-90' : ''
        }`}
      >
        {children}
      </span>
      {caption ? (
        <span className={`tabular-nums ${vertical ? 'text-[11px] font-semibold drop-shadow' : 'text-[13px] font-semibold'}`}>
          {caption}
        </span>
      ) : null}
    </button>
  )
}

/** Floating hearts; each removes itself when its CSS animation ends. */
function LikeBursts({ bursts, onDone }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-full h-40" aria-hidden>
      {bursts.map((burst) => (
        <IoHeart
          key={burst.id}
          className="live-like-burst absolute bottom-0 left-1/2 text-2xl text-[#fe2c55]"
          style={{ '--live-burst-x': `${burst.offset * 10}px` }}
          onAnimationEnd={() => onDone(burst.id)}
        />
      ))}
    </span>
  )
}

/**
 * Like / gift / share. `vertical` is the mobile overlay rail, horizontal is the desktop bar.
 */
export function LiveActionBar({
  likeCount,
  bursts,
  onLike,
  onBurstDone,
  onShare,
  shareCopied,
  onGift,
  giftsEnabled = true,
  vertical = false,
}) {
  const { t } = useTranslation()

  return (
    <div className={`flex ${vertical ? 'flex-col items-center gap-4' : 'items-center gap-2'}`}>
      <div className="relative">
        <LikeBursts bursts={bursts} onDone={onBurstDone} />
        <ActionButton
          label={t('livePage.room.like')}
          onClick={onLike}
          caption={formatLiveViewerCount(likeCount)}
          vertical={vertical}
        >
          <IoHeart className="text-[24px] text-[#fe2c55]" aria-hidden />
        </ActionButton>
      </div>
      <ActionButton
        label={t('livePage.room.gift')}
        onClick={onGift}
        disabled={!giftsEnabled}
        caption={vertical ? t('livePage.room.giftShort') : t('livePage.room.gift')}
        vertical={vertical}
      >
        <IoGiftOutline className="text-[22px]" aria-hidden />
      </ActionButton>
      <ActionButton
        label={t('livePage.room.share')}
        onClick={onShare}
        caption={shareCopied ? t('livePage.room.linkCopied') : t('livePage.room.share')}
        vertical={vertical}
      >
        <IoShareSocialOutline className="text-[22px]" aria-hidden />
      </ActionButton>
    </div>
  )
}
