import React, { useEffect, useMemo, useState } from 'react'
import { IoChevronBack, IoClose } from 'react-icons/io5'
import { SYSTEM_NOTIFICATION_FILTERS } from './activityConstants.js'
import { MOCK_SYSTEM_NOTIFICATIONS } from './activityMockData.js'
import { filterSystemNotifications } from './activitySystemUtils.js'
import { ActivitySystemNotificationCard } from './ActivitySystemNotificationCard.jsx'
import { ACTIVITY_PANEL_SHELL_CLASS } from './activityPanelShell.js'

export function ActivitySystemPanel({ onBack, onClose }) {
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    const onDocKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack?.()
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [onBack])

  const items = useMemo(() => {
    return filterSystemNotifications(MOCK_SYSTEM_NOTIFICATIONS, activeFilter)
  }, [activeFilter])

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="vibely-system-activity-title"
      className={ACTIVITY_PANEL_SHELL_CLASS}
    >
      <header className="shrink-0 border-b border-zinc-800/80 px-2 pb-2.5 pt-3">
        <div className="mb-3 flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <IoChevronBack className="text-xl" aria-hidden />
          </button>
          <h2
            id="vibely-system-activity-title"
            className="min-w-0 flex-1 truncate text-base font-bold text-white"
          >
            Thông báo hệ thống
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-1">
          {SYSTEM_NOTIFICATION_FILTERS.map((filter) => {
            const selected = activeFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold leading-tight transition ${
                  selected
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="text-xs font-medium text-zinc-400">Chưa có thông báo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ActivitySystemNotificationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
