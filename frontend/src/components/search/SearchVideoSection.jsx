import React from 'react'
import { IoFilmOutline } from 'react-icons/io5'
import { DEFAULT_AVATAR_URL, resolveVideoSearchCaption } from './searchUtils'

export function SearchVideoSection({
  items = [],
  activeKey,
  onSelect,
  getItemKey = (item) => `video-${item?.publicId}`,
}) {
  if (!items.length) return null

  return (
    <section className="px-2 py-2" aria-label="Video">
      <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <IoFilmOutline className="text-base" aria-hidden />
        Videos
      </h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const key = getItemKey(item)
          const active = activeKey === key
          const thumb = item.thumbnailUrl?.trim()
          const avatar = item.authorAvatarUrl?.trim() || DEFAULT_AVATAR_URL
          return (
            <li key={key}>
              <button
                type="button"
                data-search-nav-key={key}
                onClick={() => onSelect?.(item)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800 ring-1 ring-zinc-700">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-zinc-600">
                      <IoFilmOutline aria-hidden />
                    </div>
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">
                    {resolveVideoSearchCaption(item)}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                    <img
                      src={avatar}
                      alt=""
                      className="h-4 w-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR_URL
                      }}
                    />
                    <span className="truncate">@{item.authorUsername}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
