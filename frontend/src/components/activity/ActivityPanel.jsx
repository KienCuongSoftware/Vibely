import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { apiClient } from '../../api/client.js'
import { useActivityNotifications } from '../../hooks/useActivityNotifications.js'
import { useNotificationUnread } from '../../state/NotificationUnreadContext.jsx'
import { useAuth } from '../../state/useAuth.js'
import { ACTIVITY_FILTERS } from './activityConstants.js'
import { ACTIVITY_PANEL_SHELL_CLASS } from './activityPanelShell.js'
import { filterActivityItems, groupActivityBySection } from './activityUtils.js'
import { ActivityNotificationItem } from './ActivityNotificationItem.jsx'
import { ActivitySystemInboxRow } from './ActivitySystemInboxRow.jsx'
import { ActivitySystemPanel } from './ActivitySystemPanel.jsx'

export function ActivityPanel({ onClose }) {
  const { token } = useAuth()
  const { refreshUnreadCount, decrementUnreadCount } = useNotificationUnread()
  const [view, setView] = useState('inbox')
  const [activeFilter, setActiveFilter] = useState('all')

  const { items, systemInboxPreview, loading, error, refresh, markItemRead } = useActivityNotifications({
    token,
    enabled: view === 'inbox' && Boolean(token),
    filter: activeFilter,
  })

  useEffect(() => {
    if (!token) return undefined
    void refreshUnreadCount()
    return undefined
  }, [refreshUnreadCount, token])

  const handleMarkRead = useCallback(
    async (item) => {
      if (!token || !item || item.read) return
      try {
        await apiClient.markNotificationRead(item.id, token)
        markItemRead(item.id)
        decrementUnreadCount(1)
      } catch {
        void refresh()
        void refreshUnreadCount()
      }
    },
    [decrementUnreadCount, markItemRead, refresh, refreshUnreadCount, token],
  )

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
    const filtered = filterActivityItems(items, activeFilter)
    return groupActivityBySection(filtered)
  }, [activeFilter, items])

  if (view === 'system') {
    return (
      <ActivitySystemPanel
        token={token}
        onBack={() => setView('inbox')}
        onClose={onClose}
      />
    )
  }

  const todaySection = sections.find((section) => section.id === 'today')
  const otherSections = sections.filter((section) => section.id !== 'today')
  const isEmpty = !loading && !showSystemHub && sections.length === 0

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
        {!token ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="text-xs font-medium text-zinc-400">Đăng nhập để xem hoạt động</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
              aria-hidden
            />
            <p className="mt-3 text-xs text-zinc-500">Đang tải…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="text-xs font-medium text-zinc-400">Không tải được thông báo</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Thử lại
            </button>
          </div>
        ) : isEmpty ? (
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
                    preview={systemInboxPreview}
                    onOpen={() => setView('system')}
                  />
                ) : null}
                <div className="space-y-0.5">
                  {todaySection?.items.map((item) => (
                    <ActivityNotificationItem
                      key={item.id}
                      item={item}
                      onNavigate={onClose}
                      onMarkRead={handleMarkRead}
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
                      onMarkRead={handleMarkRead}
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
