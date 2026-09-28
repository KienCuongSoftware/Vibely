import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoAlertCircleOutline, IoRadioOutline } from 'react-icons/io5'

export function LiveSpinner({ className = 'h-7 w-7' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#fe2c55] ${className}`}
      aria-hidden
    />
  )
}

/** Shared loading / empty / error block for every LIVE screen. */
export function LiveStateView({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  const { t } = useTranslation()

  if (variant === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`} role="status">
        <LiveSpinner />
        <span className="text-sm text-zinc-400">{title ?? t('livePage.states.loading')}</span>
      </div>
    )
  }

  const Icon = variant === 'error' ? IoAlertCircleOutline : IoRadioOutline
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-16 text-center ${className}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      <Icon className="text-4xl text-zinc-500" aria-hidden />
      <p className="text-[15px] font-semibold text-zinc-100">
        {title ?? (variant === 'error' ? t('livePage.states.errorTitle') : t('livePage.states.emptyTitle'))}
      </p>
      {description ? <p className="max-w-sm text-[13px] text-zinc-500">{description}</p> : null}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 cursor-pointer rounded-full bg-[#fe2c55] px-5 py-2 text-[14px] font-semibold text-white transition hover:bg-[#e6284c]"
        >
          {actionLabel ?? t('livePage.states.retry')}
        </button>
      ) : null}
    </div>
  )
}
