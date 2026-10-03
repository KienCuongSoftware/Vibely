import React from 'react'
import { useTranslation } from 'react-i18next'
import { LIVE_CONNECTION_QUALITY } from '@/features/live/media/webrtc/liveConnectionStats.js'

const BARS = {
  [LIVE_CONNECTION_QUALITY.EXCELLENT]: 3,
  [LIVE_CONNECTION_QUALITY.GOOD]: 2,
  [LIVE_CONNECTION_QUALITY.POOR]: 1,
  [LIVE_CONNECTION_QUALITY.RECONNECTING]: 0,
  [LIVE_CONNECTION_QUALITY.UNKNOWN]: 0,
}

const BAR_COLOR = {
  [LIVE_CONNECTION_QUALITY.EXCELLENT]: 'bg-emerald-400',
  [LIVE_CONNECTION_QUALITY.GOOD]: 'bg-amber-300',
  [LIVE_CONNECTION_QUALITY.POOR]: 'bg-red-500',
}

const BAR_HEIGHT = ['h-1.5', 'h-2.5', 'h-3.5']

/**
 * Signal-bars badge for a LiveConnectionSample. Details (bitrate, RTT, loss) are in the tooltip.
 * `compact` hides the text label.
 */
export function LiveConnectionQuality({ sample, compact = false, className = '' }) {
  const { t } = useTranslation()
  if (!sample) return null
  const quality = BARS[sample.quality] == null ? LIVE_CONNECTION_QUALITY.UNKNOWN : sample.quality
  const label = t(`livePage.media.quality.${quality}`)
  const details = [
    sample.bitrateKbps != null ? `${sample.bitrateKbps} kbps` : null,
    sample.rttMs != null ? `RTT ${sample.rttMs} ms` : null,
    sample.lossPercent != null ? `${t('livePage.media.quality.loss')} ${sample.lossPercent}%` : null,
  ].filter(Boolean)
  const title = details.length ? `${label} · ${details.join(' · ')}` : label
  const lit = BARS[quality]

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${className}`}
      title={title}
      aria-label={t('livePage.media.quality.label', { quality: label })}
      data-quality={quality}
    >
      <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
        {BAR_HEIGHT.map((height, index) => (
          <span
            key={height}
            className={`w-[3px] rounded-sm ${height} ${index < lit ? BAR_COLOR[quality] : 'bg-white/30'}`}
          />
        ))}
      </span>
      {compact ? null : <span>{label}</span>}
    </span>
  )
}
