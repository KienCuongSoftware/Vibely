import React, { useEffect, useMemo, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { ACTIVITY_FILTERS } from './activityConstants.js'
import { MOCK_ACTIVITY_ITEMS, MOCK_SYSTEM_INBOX } from './activityMockData.js'
import { ACTIVITY_PANEL_SHELL_CLASS } from './activityPanelShell.js'
import { filterActivityItems, groupActivityBySection } from './activityUtils.js'
import { ActivityNotificationItem } from './ActivityNotificationItem.jsx'
import { ActivitySystemInboxRow } from './ActivitySystemInboxRow.jsx'
import { ActivitySystemPanel } from './ActivitySystemPanel.jsx'

export function ActivityPanel({ onClose }) {
  const [view, setView] = useState('inbox')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    const onDocKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (view === 'system') {
          setView('inbox')
          return
        }
        onClose?.()
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [onClose, view])

  const showSystemHub = activeFilter === 'all'

  const sections = useMemo(() => {
    const socialItems = MOCK_ACTIVITY_ITEMS.filter((item) => item.type !== 'system')
    const filtered = filterActivityItems(socialItems, activeFilter)
    return groupActivityBySection(filtered)
  }, [activeFilter])

  if (view === 'system') {
    return (
      <ActivitySystemPanel
        onBack={() => setView('inbox')}
        onClose={onClose}
      />
    )
  }

  const todaySection = sections.find((section) => section.id === 'today')
  const otherSections = sections.filter((section) => section.id !== 'today')
  const isEmpty = !showSystemHub && sections.length === 0

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="vibely-activity-title"
      className={ACTIVITY_PANEL_SHELL_CLASS}
    >
      <header className="shrink-0 border-b border-zinc-800/80 px-3 pb-2.5 pt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="vibely-activity-title" className="text-base font-bold text-white">
            Thông báo
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

        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_FILTERS.map((filter) => {
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

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 py-1.5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="text-xs font-medium text-zinc-400">Chưa có hoạt động nào</p>
            <p className="mt-1 max-w-[220px] text-[11px] text-zinc-600">
              Khi có lượt thích, bình luận hoặc follower mới, bạn sẽ thấy tại đây.
            </p>
          </div>
        ) : (
          <>
            {showSystemHub || todaySection ? (
              <section className="mb-3">
                <h3 className="px-2 py-1.5 text-xs font-semibold text-zinc-500">
                  Hôm nay
                </h3>
                {showSystemHub ? (
                  <ActivitySystemInboxRow
                    preview={MOCK_SYSTEM_INBOX.preview}
                    onOpen={() => setView('system')}
                  />
                ) : null}
                <div className="space-y-0.5">
                  {todaySection?.items.map((item) => (
                    <ActivityNotificationItem
                      key={item.id}
                      item={item}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {otherSections.map((section) => (
              <section key={section.id} className="mb-3">
                <h3 className="px-2 py-1.5 text-xs font-semibold text-zinc-500">
                  {section.label}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <ActivityNotificationItem
                      key={item.id}
                      item={item}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
