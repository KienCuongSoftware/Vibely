import React from 'react'
import { formatMetricDeltaLabel } from '@/features/studio/utils/studioMetricDelta.js'

export function StudioMetricDeltaLine({ current, previous, money = false, className = '' }) {
  const { text, tone } = formatMetricDeltaLabel(current, previous, { money })
  const toneClass =
    tone === 'up' ? 'text-sky-500' : tone === 'down' ? 'text-rose-400' : 'text-zinc-500'
  return (
    <p className={`mt-0.5 text-[11px] tabular-nums ${toneClass} ${className}`}>{text}</p>
  )
}
