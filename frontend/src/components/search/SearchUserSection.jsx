import React from 'react'
import { IoPerson } from 'react-icons/io5'
import { DEFAULT_AVATAR_URL } from './searchUtils'

export function SearchUserSection({
  items = [],
  activeKey,
  onSelect,
  getItemKey = (item) => `user-${item?.id ?? item?.username}`,
}) {
  if (!items.length) return null

  return (
    <section className="px-2 py-2" aria-label="Người dùng">
      <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <IoPerson className="text-base" aria-hidden />
        Users
      </h3>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const key = getItemKey(item)
          const active = activeKey === key
          const avatar = item.avatarUrl?.trim() || DEFAULT_AVATAR_URL
          return (
            <li key={key}>
              <button
                type="button"
                data-search-nav-key={key}
                onClick={() => onSelect?.(item)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <img
                  src={avatar}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR_URL
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {item.displayName || item.username}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">@{item.username}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
