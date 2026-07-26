import React from 'react'
import { IoChevronBack, IoSearchOutline } from 'react-icons/io5'

export function MobileSearchBar({
  value,
  onChange,
  onSubmit,
  onBack,
  placeholder = 'Tìm kiếm',
  autoFocus = true,
  inputId = 'vibely-mobile-search-input',
}) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-1.5 border-b border-zinc-800/90 bg-black px-2 py-2.5">
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl text-white"
        aria-label="Quay lại"
        onClick={onBack}
      >
        <IoChevronBack aria-hidden />
      </button>
      <form
        className="flex min-w-0 flex-1 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.(value)
        }}
      >
        <div className="relative min-w-0 flex-1">
          <IoSearchOutline
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-zinc-500"
            aria-hidden
          />
          <input
            id={inputId}
            type="search"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full rounded-full border-0 bg-zinc-800/95 py-0 pl-9 pr-3 text-[15px] text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:bg-zinc-800"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 cursor-pointer px-1 text-[15px] font-semibold text-[#fe2c55] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!String(value ?? '').trim()}
        >
          Tìm kiếm
        </button>
      </form>
    </header>
  )
}
