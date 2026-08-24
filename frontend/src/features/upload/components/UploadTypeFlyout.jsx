import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { IoImagesOutline, IoVideocamOutline } from 'react-icons/io5'

/**
 * TikTok-style hover menu: Video / Photo, to the right of the trigger.
 * Rendered in a portal so sidebar overflow cannot clip it.
 */
export function UploadTypeFlyout({
  children,
  onPickVideo,
  onPickPhoto,
  placement = 'end',
  panelClassName = '',
}) {
  const { t } = useTranslation()
  const menuId = useId()
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const closeTimer = useRef(null)

  const clearClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }

  const updateCoords = () => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (placement === 'bottom') {
      setCoords({ top: rect.bottom + 6, left: rect.left })
      return
    }
    const top = placement === 'center' ? rect.top + rect.height / 2 : rect.top
    setCoords({ top, left: rect.right + 8 })
  }

  useEffect(() => () => clearClose(), [])

  useLayoutEffect(() => {
    if (!open) return undefined
    updateCoords()
    const onReposition = () => updateCoords()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, placement])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (event) => {
      const t = event.target
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const itemClass =
    'vibely-upload-flyout-item flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-100'

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          style={{
            top: coords.top,
            left: coords.left,
            transform: placement === 'center' ? 'translateY(-50%)' : undefined,
          }}
          className={`vibely-upload-flyout fixed z-[200] min-w-[176px] rounded-2xl py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.18)] ${panelClassName}`}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
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
        </div>,
        document.body,
      )
    : null

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
      {typeof children === 'function'
        ? children({
            open,
            menuId,
            toggle: () => setOpen((v) => !v),
          })
        : children}
      {panel}
    </div>
  )
}
