import React, { useCallback, useMemo } from 'react'
import {
  FaFacebookF,
  FaLinkedinIn,
  FaPinterestP,
  FaRedditAlien,
  FaTelegramPlane,
  FaWhatsapp,
} from 'react-icons/fa'
import { SiLine, SiX } from 'react-icons/si'
import { IoArrowRedo, IoCodeSlash, IoMailOutline } from 'react-icons/io5'
import { LuRepeat2 } from 'react-icons/lu'
import { apiClient } from '../../api/client'
import {
  buildCurrentPageShareUrl,
  buildShareableEmbedUrl,
  buildShareableVideoUrl,
} from '../../utils/shareUrl.js'
import { pickShareCaption } from '../../utils/shareCaption.js'
import { shareIdempotencyKey } from '../../utils/shareLinks.js'
import { buildPlatformShareUrl } from '../../utils/shareLinks.platform.js'

const CIRCLE_BTN =
  'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'

const MORE_SHARE_OPTIONS = [
  { channel: 'twitter', label: 'X', icon: SiX, iconClass: 'text-base' },
  { channel: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn, iconClass: 'text-sm' },
  { channel: 'reddit', label: 'Reddit', icon: FaRedditAlien, iconClass: 'text-sm' },
  { channel: 'telegram', label: 'Telegram', icon: FaTelegramPlane, iconClass: 'text-sm' },
  { channel: 'email', label: 'Email', icon: IoMailOutline, iconClass: 'text-base' },
  { channel: 'line', label: 'Line', icon: SiLine, iconClass: 'text-sm' },
  { channel: 'pinterest', label: 'Pinterest', icon: FaPinterestP, iconClass: 'text-sm' },
]

function WatchShareTip({ tip, children }) {
  return (
    <div className="group/watch-tip relative flex shrink-0">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#545454] px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/watch-tip:opacity-100"
      >
        {tip}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-[#545454]"
        />
      </span>
    </div>
  )
}

function WatchShareCircleButton({ className, tip, onClick, disabled, children }) {
  return (
    <WatchShareTip tip={tip}>
      <button
        type="button"
        className={`${CIRCLE_BTN} ${className}`}
        aria-label={tip}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    </WatchShareTip>
  )
}

/** Hàng icon chia sẻ kiểu TikTok desktop (repost, nhúng, Telegram, Facebook, WhatsApp, thêm). */
export function WatchShareStrip({
  videoPublicId,
  authorUsername,
  videoTitle = '',
  videoDescription = '',
  token,
  onShareCountChange,
  disabled = false,
  reposted = false,
  repostBusy = false,
  onRepostToggle,
}) {
  const shareCaption = useMemo(
    () =>
      pickShareCaption({ title: videoTitle, description: videoDescription }) ||
      'Vibely',
    [videoTitle, videoDescription],
  )

  const watchUrl = useMemo(
    () => buildShareableVideoUrl(videoPublicId, authorUsername),
    [videoPublicId, authorUsername],
  )
  const embedUrl = useMemo(
    () => buildShareableEmbedUrl(videoPublicId),
    [videoPublicId],
  )

  const recordShare = useCallback(
    async (channel) => {
      if (!videoPublicId) return
      try {
        if (token) {
          const data = await apiClient.createVideoShare(String(videoPublicId), token, {
            channel,
            referrer: buildCurrentPageShareUrl() || null,
            idempotencyKey: shareIdempotencyKey(channel, videoPublicId),
          })
          if (data?.shareCount != null) {
            onShareCountChange?.(Number(data.shareCount))
          }
        } else {
          await apiClient.recordVideoShare(String(videoPublicId))
          onShareCountChange?.(null)
        }
      } catch {
        /* ghi share thất bại — không chặn UI */
      }
    },
    [videoPublicId, token, onShareCountChange],
  )

  const copyText = useCallback(
    async (text, channel) => {
      const value = String(text ?? '').trim()
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        await recordShare(channel)
      } catch {
        /* clipboard blocked */
      }
    },
    [recordShare],
  )

  const openPlatform = useCallback(
    (channel) => {
      const url = buildPlatformShareUrl(channel, {
        url: watchUrl,
        title: shareCaption,
      })
      if (!url) return
      if (channel === 'email') {
        window.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      void recordShare(channel)
    },
    [watchUrl, shareCaption, recordShare],
  )

  const handleRepost = useCallback(() => {
    if (disabled || repostBusy) return
    onRepostToggle?.()
  }, [disabled, repostBusy, onRepostToggle])

  const handleEmbed = useCallback(() => {
    const snippet = `<iframe src="${embedUrl}" width="325" height="580" frameborder="0" allowfullscreen></iframe>`
    void copyText(snippet, 'embed')
  }, [copyText, embedUrl])

  if (!videoPublicId) return null

  return (
    <div className="flex shrink-0 items-center gap-1">
      <WatchShareCircleButton
        className={`bg-[#FACE15] text-black ${reposted ? 'ring-2 ring-[#FACE15]/60 ring-offset-1 ring-offset-black' : ''}`}
        tip={reposted ? 'Xóa video đăng lại' : 'Đăng lại'}
        disabled={disabled || repostBusy}
        onClick={handleRepost}
      >
        <LuRepeat2 className="text-sm" strokeWidth={2.25} aria-hidden />
      </WatchShareCircleButton>
      <WatchShareCircleButton
        className="bg-zinc-600"
        tip="Nhúng"
        disabled={disabled}
        onClick={handleEmbed}
      >
        <IoCodeSlash className="text-sm text-white" aria-hidden />
      </WatchShareCircleButton>
      <WatchShareCircleButton
        className="bg-[#FE2C55]"
        tip="Telegram"
        disabled={disabled}
        onClick={() => void openPlatform('telegram')}
      >
        <FaTelegramPlane className="text-[0.7rem]" aria-hidden />
      </WatchShareCircleButton>
      <WatchShareCircleButton
        className="bg-[#1877F2]"
        tip="Facebook"
        disabled={disabled}
        onClick={() => void openPlatform('facebook')}
      >
        <FaFacebookF className="text-[0.7rem]" aria-hidden />
      </WatchShareCircleButton>
      <WatchShareCircleButton
        className="bg-[#25D366]"
        tip="WhatsApp"
        disabled={disabled}
        onClick={() => void openPlatform('whatsapp')}
      >
        <FaWhatsapp className="text-xs" aria-hidden />
      </WatchShareCircleButton>

      <div className="group/watch-more relative shrink-0">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-xl text-white transition hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Thêm tùy chọn chia sẻ"
          aria-haspopup="menu"
          disabled={disabled}
        >
          <IoArrowRedo aria-hidden />
        </button>
        <div className="pointer-events-none absolute right-0 top-full z-[80] mt-1.5 w-[min(240px,calc(100vw-2rem))] opacity-0 transition-opacity duration-150 group-hover/watch-more:pointer-events-auto group-hover/watch-more:opacity-100 group-focus-within/watch-more:pointer-events-auto group-focus-within/watch-more:opacity-100">
          <span
            aria-hidden
            className="absolute right-2 top-0 z-10 -translate-y-full border-[6px] border-transparent border-b-[#252525]"
          />
          <div
            role="menu"
            className="overflow-hidden rounded-xl border border-white/10 bg-[#252525] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
          >
            {MORE_SHARE_OPTIONS.map(({ channel, label, icon: Icon, iconClass }) => (
              <button
                key={channel}
                type="button"
                role="menuitem"
                disabled={disabled}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void openPlatform(channel)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white">
                  <Icon className={iconClass} aria-hidden />
                </span>
                <span>{`Chia sẻ lên ${label}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
