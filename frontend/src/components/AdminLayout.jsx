import React, { useState } from 'react'
import { IoMenu } from 'react-icons/io5'
import { AdminSidebar } from './AdminSidebar.jsx'
import { StudioAccountMenu } from './StudioAccountMenu.jsx'

export function AdminLayout({ active = 'users', title, subtitle, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <section className="flex h-dvh overflow-hidden bg-black text-zinc-100">
      <AdminSidebar active={active} className="hidden lg:flex" />

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-200 bg-black/50 lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <AdminSidebar
            active={active}
            className="fixed inset-y-0 left-0 z-210 flex w-[min(280px,85vw)] shadow-2xl lg:hidden"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-black p-3 sm:p-6 lg:p-8">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 sm:mb-6 sm:gap-4 sm:pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-zinc-200 hover:bg-zinc-900 lg:hidden"
              aria-label="Menu Admin"
              onClick={() => setMobileNavOpen(true)}
            >
              <IoMenu aria-hidden />
            </button>
            <span className="min-w-0 truncate text-base font-bold text-white sm:text-lg lg:text-xl">
              Vibely Admin
            </span>
          </div>
          <StudioAccountMenu />
        </div>

        <header className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 sm:mb-6">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
        </header>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {children}
        </div>
      </main>
    </section>
  )
}
