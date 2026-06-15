import React from 'react'
import { Link } from 'react-router-dom'
import {
  MobileFeedBottomNav,
} from './MobileFeedShell.jsx'

export function MobileLoginPrompt({ title, description, loginTo = '/login' }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[17px] font-semibold text-zinc-100">{title}</p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">{description}</p>
      <Link
        to={loginTo}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-[#fe2c55] px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#ff4d70]"
      >
        Đăng nhập
      </Link>
    </div>
  )
}

export function MobilePageShell({
  token,
  user,
  onSelectMenu,
  activeNavId = 'latest',
  children,
}) {
  return (
    <section className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-black text-zinc-100 lg:hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <MobileFeedBottomNav
        token={token}
        user={user}
        activeId={activeNavId}
        onSelectMenu={onSelectMenu}
      />
    </section>
  )
}
