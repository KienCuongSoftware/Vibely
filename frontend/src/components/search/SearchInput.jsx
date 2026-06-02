import React, { forwardRef } from 'react'
import { IoCloseCircle, IoSearchOutline } from 'react-icons/io5'

export const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    onClear,
    onKeyDown,
    placeholder = 'Tìm kiếm',
    autoFocus = true,
    id = 'vibely-search-input',
  },
  ref,
) {
  return (
    <div className="relative">
      <IoSearchOutline
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-zinc-500"
        aria-hidden
      />
      <input
        ref={ref}
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-zinc-800 bg-zinc-900/90 py-0 pl-11 pr-10 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-zinc-900"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Xóa từ khóa"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <IoCloseCircle className="text-xl" aria-hidden />
        </button>
      ) : null}
    </div>
  )
})
