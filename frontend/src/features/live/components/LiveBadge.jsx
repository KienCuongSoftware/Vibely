import React from 'react'

export function LiveBadge({ className = '', compact = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm bg-[#fe2c55] font-bold uppercase tracking-wide text-white ${compact ? 'px-1 py-0.5 text-[9px] leading-none' : 'px-1.5 py-0.5 text-[10px] leading-none'} ${className}`}
    >
      LIVE
    </span>
  )
}
