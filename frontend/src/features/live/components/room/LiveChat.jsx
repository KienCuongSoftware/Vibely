import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowDown, IoRefresh, IoSend } from 'react-icons/io5'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import { LIVE_CHAT, LIVE_LIMITS } from '@/features/live/constants/liveConstants.js'
import { LiveVerifiedBadge } from '@/features/live/components/LiveVerifiedBadge.jsx'
import { LiveSpinner, LiveStateView } from '@/features/live/components/LiveStateView.jsx'

const LiveChatMessage = memo(function LiveChatMessage({ message, timeFormatter, overlay, onRetry }) {
  const { t } = useTranslation()
  const author = message.author ?? {}
  const createdAt = message.createdAt ? new Date(message.createdAt) : null

  return (
    <li
      className={`flex items-start gap-2 ${overlay ? 'py-1' : 'rounded-lg px-2 py-1.5 hover:bg-white/5'} ${
        message.pending ? 'opacity-60' : ''
      }`}
    >
      <AvatarImage src={author.avatarUrl} className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-[12px]">
          <span className={`truncate font-semibold ${overlay ? 'text-white/80 drop-shadow' : 'text-zinc-400'}`}>
            {author.displayName || author.username}
          </span>
          {author.verified ? <LiveVerifiedBadge className="text-xs" /> : null}
          {createdAt && !overlay ? (
            <time dateTime={message.createdAt} className="shrink-0 text-[11px] text-zinc-600">
              {timeFormatter.format(createdAt)}
            </time>
          ) : null}
        </p>
        <p className={`break-words text-[13px] leading-snug ${overlay ? 'text-white drop-shadow' : 'text-zinc-100'}`}>
          {message.text}
        </p>
        {message.failed ? (
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="mt-0.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#fe2c55]"
          >
            <IoRefresh aria-hidden />
            {t('livePage.chat.retry')}
          </button>
        ) : null}
      </div>
    </li>
  )
})

function LiveCommentInput({ onSend, disabled, disabledReason, onRequireAuth, overlay }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const remaining = LIVE_LIMITS.COMMENT_MAX - text.length
  const canSend = !disabled && text.trim().length > 0 && remaining >= 0

  const submit = (event) => {
    event.preventDefault()
    if (!onRequireAuth()) return
    if (canSend && onSend(text)) setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div
        className={`live-comment-field flex min-w-0 flex-1 items-center rounded-full px-4 ${
          overlay ? 'bg-black/40 backdrop-blur-sm' : 'bg-white/10'
        }`}
      >
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, LIVE_LIMITS.COMMENT_MAX))}
          onFocus={() => onRequireAuth()}
          disabled={disabled}
          maxLength={LIVE_LIMITS.COMMENT_MAX}
          placeholder={disabled ? disabledReason : t('livePage.chat.placeholder')}
          aria-label={t('livePage.chat.placeholder')}
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed"
        />
        {text.length > 0 ? (
          <span className={`ml-2 shrink-0 text-[11px] tabular-nums ${remaining < 10 ? 'text-[#fe2c55]' : 'text-zinc-500'}`}>
            {remaining}
          </span>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        aria-label={t('livePage.chat.send')}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#fe2c55] text-white transition hover:bg-[#e6284c] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IoSend className="text-[16px]" aria-hidden />
      </button>
    </form>
  )
}

/**
 * Room chat. Keeps the view pinned to the newest message unless the user has
 * scrolled up, in which case a "new messages" pill appears instead.
 * The message list is bounded upstream (LIVE_CHAT.MAX_BUFFERED_MESSAGES).
 */
export function LiveChat({
  messages,
  status,
  onSend,
  onRetry,
  onRequireAuth,
  commentsEnabled = true,
  overlay = false,
  className = '',
}) {
  const { t, i18n } = useTranslation()
  const listRef = useRef(null)
  const pinnedRef = useRef(true)
  const [unseen, setUnseen] = useState(0)
  const lastCountRef = useRef(messages.length)

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    [i18n.language],
  )

  useLayoutEffect(() => {
    const list = listRef.current
    const added = Math.max(0, messages.length - lastCountRef.current)
    lastCountRef.current = messages.length
    if (!list) return
    if (pinnedRef.current) {
      list.scrollTop = list.scrollHeight
    } else if (added > 0) {
      setUnseen((prev) => prev + added)
    }
  }, [messages])

  const handleScroll = () => {
    const list = listRef.current
    if (!list) return
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight
    pinnedRef.current = distance <= LIVE_CHAT.AUTO_SCROLL_THRESHOLD_PX
    if (pinnedRef.current) setUnseen(0)
  }

  const jumpToLatest = () => {
    const list = listRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
    pinnedRef.current = true
    setUnseen(0)
  }

  const renderBody = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-1 items-center justify-center" role="status">
          <LiveSpinner className="h-5 w-5" />
          <span className="sr-only">{t('livePage.chat.loading')}</span>
        </div>
      )
    }
    if (status === 'error') {
      return <LiveStateView variant="error" description={t('livePage.chat.error')} className="flex-1 py-6" />
    }
    if (!messages.length) {
      return (
        <p className={`flex flex-1 items-center justify-center px-4 text-center text-[13px] ${overlay ? 'text-white/70' : 'text-zinc-500'}`}>
          {commentsEnabled ? t('livePage.chat.empty') : t('livePage.chat.disabled')}
        </p>
      )
    }
    return (
      <ul
        ref={listRef}
        onScroll={handleScroll}
        className={`scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain ${overlay ? 'live-chat-overlay-mask px-1' : 'px-2 py-2'}`}
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message) => (
          <LiveChatMessage
            key={message.clientId ?? message.id}
            message={message}
            timeFormatter={timeFormatter}
            overlay={overlay}
            onRetry={onRetry}
          />
        ))}
      </ul>
    )
  }

  return (
    <section className={`relative flex min-h-0 flex-col ${className}`} aria-label={t('livePage.chat.title')}>
      {renderBody()}
      {unseen > 0 ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-16 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-black shadow-lg"
        >
          <IoArrowDown aria-hidden />
          {t('livePage.chat.newMessages', { count: unseen })}
        </button>
      ) : null}
      <div className={overlay ? 'pt-2' : 'border-t border-white/10 p-3'}>
        <LiveCommentInput
          onSend={onSend}
          disabled={!commentsEnabled}
          disabledReason={t('livePage.chat.disabled')}
          onRequireAuth={onRequireAuth}
          overlay={overlay}
        />
      </div>
    </section>
  )
}
