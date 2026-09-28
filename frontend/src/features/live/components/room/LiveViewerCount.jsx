import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { IoPeopleOutline } from 'react-icons/io5'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

export const LiveViewerCount = memo(function LiveViewerCount({ count, compact = false, className = '' }) {
  const { t } = useTranslation()
  const formatted = formatLiveViewerCount(count)
  const label = t('livePage.viewersLabel', { count: formatted })

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white backdrop-blur-sm ${className}`}
      aria-label={label}
      aria-live="polite"
    >
      <IoPeopleOutline className="text-sm" aria-hidden />
      {compact ? formatted : label}
    </span>
  )
})
