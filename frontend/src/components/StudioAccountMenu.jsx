import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoLogOutOutline, IoPersonOutline, IoSettingsOutline } from 'react-icons/io5'
import { useAuth } from '../state/useAuth'

/** @param {'dark' | 'light'} [theme='dark'] */
export function StudioAccountMenu({ theme = 'dark' }) {
  const light = theme === 'light'
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const avatarSrc =
    user?.avatarUrl && String(user.avatarUrl).trim()
      ? user.avatarUrl
      : '/images/users/default-avatar.jpeg'

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

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className={
          light
            ? 'flex cursor-pointer rounded-full p-0.5 ring-1 ring-slate-300 transition hover:ring-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]'
            : 'flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-600 transition hover:ring-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55]'
        }
        aria-label="Menu tài khoản"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <img
          src={avatarSrc}
          alt=""
          className={
            light
              ? 'h-9 w-9 rounded-full border border-slate-200 object-cover'
              : 'h-9 w-9 rounded-full border border-zinc-800 object-cover'
          }
          referrerPolicy="no-referrer"
        />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Tài khoản"
          className={
            light
              ? 'absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.12)]'
              : 'absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-zinc-700 bg-black py-1 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)]'
          }
        >
          <button
            type="button"
            role="menuitem"
            className={
              light
                ? 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50'
                : 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-zinc-900'
            }
            onClick={() => {
              setOpen(false)
              navigate('/profile')
            }}
          >
            <IoPersonOutline
              className={light ? 'text-lg text-slate-500' : 'text-lg text-zinc-400'}
              aria-hidden
            />
            Hồ sơ
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Tính năng đang phát triển"
            className={
              light
                ? 'flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-400'
                : 'flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-zinc-500'
            }
          >
            <IoSettingsOutline
              className={light ? 'text-lg text-slate-400' : 'text-lg text-zinc-600'}
              aria-hidden
            />
            Cài đặt
          </button>
          <div className={light ? 'my-1 border-t border-slate-100' : 'my-1 border-t border-zinc-800'} aria-hidden />
          <button
            type="button"
            role="menuitem"
            className={
              light
                ? 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50'
                : 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-zinc-900'
            }
            onClick={() => {
              setOpen(false)
              logout()
              navigate('/login', { replace: true })
            }}
          >
            <IoLogOutOutline
              className={light ? 'text-lg text-slate-500' : 'text-lg text-zinc-400'}
              aria-hidden
            />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  )
}
