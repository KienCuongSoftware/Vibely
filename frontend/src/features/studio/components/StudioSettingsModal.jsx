import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronForward,
  IoClose,
  IoGlobeOutline,
  IoLockClosedOutline,
  IoPersonOutline,
} from 'react-icons/io5'
import { useAuth } from '@/store/useAuth'

/**
 * Modal Cài đặt kiểu TikTok Studio — nhãn tiếng Việt.
 * @param {boolean} open
 * @param {'dark' | 'light'} [theme='dark']
 * @param {() => void} onClose
 */
export function StudioSettingsModal({ open, theme = 'dark', onClose }) {
  const light = theme === 'light'
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const goFullSettings = (hash = '') => {
    onClose?.()
    if (isAdmin) return
    navigate(hash ? `/settings${hash}` : '/settings')
  }

  const rowClass = light
    ? 'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50'
    : 'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-zinc-800/80'

  const iconClass = light ? 'text-lg text-slate-500' : 'text-lg text-zinc-400'
  const titleClass = light ? 'text-sm font-medium text-slate-900' : 'text-sm font-medium text-zinc-100'
  const hintClass = light ? 'mt-0.5 text-xs text-slate-500' : 'mt-0.5 text-xs text-zinc-500'

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={() => onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-settings-title"
        className={
          light
            ? 'w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl'
            : 'w-full max-w-md overflow-hidden rounded-xl border border-zinc-700/80 bg-[#1a1a1a] shadow-2xl'
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={
            light
              ? 'relative border-b border-slate-200 px-5 pb-3 pt-4'
              : 'relative border-b border-zinc-800 px-5 pb-3 pt-4'
          }
        >
          <h2
            id="studio-settings-title"
            className={
              light
                ? 'pr-10 text-base font-semibold text-slate-900'
                : 'pr-10 text-base font-semibold text-zinc-100'
            }
          >
            Cài đặt
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={
              light
                ? 'absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'
                : 'absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100'
            }
            aria-label="Đóng"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        <div className="px-2 py-2">
          <div className={rowClass} role="group" aria-label="Ngôn ngữ ứng dụng">
            <IoGlobeOutline className={iconClass} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={titleClass}>Ngôn ngữ ứng dụng</p>
              <p className={hintClass}>Tiếng Việt</p>
            </div>
            <span className={light ? 'text-xs font-medium text-slate-500' : 'text-xs font-medium text-zinc-500'}>
              Tiếng Việt
            </span>
          </div>

          {!isAdmin ? (
            <>
              <button type="button" className={rowClass} onClick={() => goFullSettings('#account')}>
                <IoPersonOutline className={iconClass} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={titleClass}>Quản lý tài khoản</p>
                  <p className={hintClass}>Thông tin tài khoản và bảo mật</p>
                </div>
                <IoChevronForward
                  className={light ? 'text-base text-slate-400' : 'text-base text-zinc-500'}
                  aria-hidden
                />
              </button>

              <button type="button" className={rowClass} onClick={() => goFullSettings('#privacy')}>
                <IoLockClosedOutline className={iconClass} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={titleClass}>Quyền riêng tư</p>
                  <p className={hintClass}>Bình luận, tin nhắn và hồ sơ</p>
                </div>
                <IoChevronForward
                  className={light ? 'text-base text-slate-400' : 'text-base text-zinc-500'}
                  aria-hidden
                />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
