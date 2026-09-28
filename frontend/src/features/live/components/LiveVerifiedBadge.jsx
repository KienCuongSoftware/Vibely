import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoCheckmarkCircle } from 'react-icons/io5'

export function LiveVerifiedBadge({ className = 'text-sm' }) {
  const { t } = useTranslation()
  return (
    <IoCheckmarkCircle
      className={`shrink-0 text-sky-400 ${className}`}
      role="img"
      aria-label={t('livePage.verified')}
    />
  )
}
