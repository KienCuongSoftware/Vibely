import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoLogOutOutline,
  IoOpenOutline,
  IoPersonOutline,
  IoSettingsOutline,
} from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { StudioSettingsModal } from '@/features/studio/components/StudioSettingsModal.jsx'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import {
  DEFAULT_AVATAR_URL,
  sanitizeAvatarUrl,
} from '@/features/profile/utils/avatarUrl.js'
import { FORCE_GUEST_AFTER_LOAD_KEY } from '@/shared/utils/lazyWithChunkRetry.js'

/** @param {'dark' | 'light'} [theme='dark'] */
export function StudioAccountMenu({ theme = 'dark' }) {
  const { t } = useTranslation()
  const light = theme === 'light'
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const wrapRef = useRef(null)
  const avatarSrc = sanitizeAvatarUrl(
    user?.avatarUrl,
    DEFAULT_AVATAR_URL,
    user?.id,
  )

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass = light
    ? 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50'
    : 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-zinc-900'
  const iconClass = light ? 'text-lg text-slate-500' : 'text-lg text-zinc-400'

  return (
    <>
      <div className="relative shrink-0" ref={wrapRef}>
        <button
          type="button"
          className={
            light
              ? 'flex cursor-pointer rounded-full p-0.5 ring-1 ring-slate-300 transition hover:ring-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]'
              : 'flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-600 transition hover:ring-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]'
          }
          aria-label={t('studio.account.menuAria')}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          <AvatarImage
            src={avatarSrc}
            alt=""
            className={
              light
                ? 'h-9 w-9 rounded-full border border-slate-200 object-cover'
                : 'h-9 w-9 rounded-full border border-zinc-800 object-cover'
            }
          />
        </button>
        {open ? (
          <div
            role="menu"
            aria-label={t('studio.account.menuLabel')}
            className={
              light
                ? 'absolute right-0 z-50 mt-2 min-w-55 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.12)]'
                : 'absolute right-0 z-50 mt-2 min-w-55 overflow-hidden rounded-xl border border-zinc-700 bg-black py-1 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)]'
            }
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
            >
              <IoPersonOutline className={iconClass} aria-hidden />
              <span className="min-w-0 flex-1">{t('studio.account.profile')}</span>
              <IoOpenOutline
                className={light ? 'text-base text-slate-400' : 'text-base text-zinc-500'}
                aria-hidden
              />
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                setSettingsOpen(true)
              }}
            >
              <IoSettingsOutline className={iconClass} aria-hidden />
              {t('studio.account.settings')}
            </button>
            <div
              className={light ? 'my-1 border-t border-slate-100' : 'my-1 border-t border-zinc-800'}
              aria-hidden
            />
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                void (async () => {
                  // Mark guest before logout/reload so bootstrap cannot revive admin via refresh.
                  try {
                    sessionStorage.setItem(FORCE_GUEST_AFTER_LOAD_KEY, '1')
                  } catch {
                    /* ignore */
                  }
                  await logout()
                  // Land on feed as guest — do not bounce through /login (that fought admin redirect).
                  window.location.replace('/')
                })()
              }}
            >
              <IoLogOutOutline className={iconClass} aria-hidden />
              {t('studio.account.logout')}
            </button>
          </div>
        ) : null}
      </div>

      <StudioSettingsModal
        open={settingsOpen}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
