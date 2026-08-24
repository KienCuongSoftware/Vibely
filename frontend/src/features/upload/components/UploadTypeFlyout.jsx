import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoImagesOutline, IoVideocamOutline } from 'react-icons/io5'

/**
 * TikTok-style hover menu: Video / Photo, to the right of the trigger.
 */
export function UploadTypeFlyout({
  children,
  onPickVideo,
  onPickPhoto,
  align = 'start',
  panelClassName = '',
}) {
  const { t } = useTranslation()
  const menuId = useId()
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const clearClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => () => clearClose(), [])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const itemClass =
    'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-100 hover:bg-zinc-700/80'

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        clearClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      {children({
        open,
        menuId,
        toggle: () => setOpen((v) => !v),
      })}
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute left-full z-[90] min-w-[176px] rounded-2xl bg-zinc-800 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)] ${
            align === 'center' ? 'top-1/2 -translate-y-1/2' : 'top-0'
          } ml-2 ${panelClassName}`}
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              onPickVideo?.()
            }}
          >
            <IoVideocamOutline className="text-lg" aria-hidden />
            {t('nav.uploadVideo')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              onPickPhoto?.()
            }}
          >
            <IoImagesOutline className="text-lg" aria-hidden />
            {t('nav.uploadPhoto')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
