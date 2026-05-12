import React from 'react'
import { StudioSidebar } from './StudioSidebar'

export function StudioLayout({ active, title, subtitle, children, hidePageHeader = false }) {
  return (
    <section className="flex min-h-dvh bg-[#0a0a0a] text-zinc-100">
      <StudioSidebar active={active} />
      <main className="min-h-dvh min-w-0 flex-1 bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
        {!hidePageHeader ? (
          <header className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
          </header>
        ) : null}
        {children}
      </main>
    </section>
  )
}
