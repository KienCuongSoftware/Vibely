import React, { useEffect, useMemo, useState } from 'react'
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5'
import { useAuth } from '@/store/useAuth'

const DEFAULT_SETTINGS = {
  musicCopyrightCheck: true,
  contentCheckLite: true,
  allowVideoInsights: true,
  includeCommentsForInsights: true,
}

const SETTINGS_ROWS = [
  {
    key: 'musicCopyrightCheck',
    title: 'Tự động kiểm tra bản quyền âm nhạc',
    description:
      'Chúng tôi sẽ tự động kiểm tra xem video của bạn có nhạc chưa được cấp phép có thể khiến video bị tắt tiếng hay không.',
    showInfo: true,
  },
  {
    key: 'contentCheckLite',
    title: 'Tự động kiểm tra nội dung rút gọn',
    description:
      'Chúng tôi sẽ tự động kiểm tra nội dung của bạn để đánh giá khả năng đủ điều kiện xuất hiện trên trang Đề xuất.',
    showInfo: true,
  },
  {
    key: 'allowVideoInsights',
    title: 'Cho phép thông tin chi tiết về video của tôi',
    description:
      'Vibely sẽ dùng AI để tóm tắt và phân loại bình luận thành các nhóm: Chủ đề, Cảm hứng, Yêu thích và Câu hỏi.',
    showInfo: false,
  },
  {
    key: 'includeCommentsForInsights',
    title: 'Bao gồm các bình luận của tôi để phân tích',
    description:
      'Vibely sẽ đưa bình luận của bạn vào khi dùng AI để tóm tắt và lọc bình luận trên các video khác.',
    showInfo: false,
  },
]

function storageKey(userId) {
  return `vibely.studio.settings.${userId || 'guest'}`
}

function loadSettings(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function SettingsSwitch({ checked, onChange, label, light }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-teal-400' : light ? 'bg-slate-300' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

/**
 * Modal Cài đặt kiểu TikTok Studio — sidebar Thỏa thuận + toggle, nhãn tiếng Việt.
 * @param {boolean} open
 * @param {'dark' | 'light'} [theme='dark']
 * @param {() => void} onClose
 */
export function StudioSettingsModal({ open, theme = 'dark', onClose }) {
  const light = theme === 'light'
  const { user } = useAuth()
  const userId = user?.id ?? user?.username ?? 'guest'
  const saved = useMemo(() => loadSettings(userId), [userId, open])
  const [draft, setDraft] = useState(saved)
  const [activeNav, setActiveNav] = useState('agreement')

  useEffect(() => {
    if (!open) return undefined
    setDraft(loadSettings(userId))
    setActiveNav('agreement')
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, userId])

  if (!open) return null

  const dirty = SETTINGS_ROWS.some((row) => draft[row.key] !== saved[row.key])

  const handleCancel = () => {
    setDraft(saved)
    onClose?.()
  }

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(draft))
    } catch {
      /* ignore quota */
    }
    onClose?.()
  }

  const setToggle = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={handleCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-settings-title"
        className={
          light
            ? 'flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'
            : 'flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-[#1a1a1a] shadow-2xl'
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={
            light
              ? 'relative shrink-0 border-b border-slate-200 px-5 py-4'
              : 'relative shrink-0 border-b border-zinc-800 px-5 py-4'
          }
        >
          <h2
            id="studio-settings-title"
            className={
              light
                ? 'pr-10 text-lg font-bold text-slate-900'
                : 'pr-10 text-lg font-bold text-zinc-100'
            }
          >
            Cài đặt
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className={
              light
                ? 'absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'
                : 'absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100'
            }
            aria-label="Đóng"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav
            className={
              light
                ? 'hidden w-44 shrink-0 border-r border-slate-200 p-3 sm:block'
                : 'hidden w-44 shrink-0 border-r border-zinc-800 p-3 sm:block'
            }
            aria-label="Mục cài đặt"
          >
            <button
              type="button"
              onClick={() => setActiveNav('agreement')}
              className={
                activeNav === 'agreement'
                  ? light
                    ? 'w-full rounded-lg bg-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-slate-900'
                    : 'w-full rounded-lg bg-zinc-800 px-3 py-2.5 text-left text-sm font-semibold text-zinc-100'
                  : light
                    ? 'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50'
                    : 'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-400 hover:bg-zinc-900'
              }
            >
              Thỏa thuận
            </button>
          </nav>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
            <p
              className={
                light
                  ? 'mb-3 text-sm font-semibold text-slate-900 sm:hidden'
                  : 'mb-3 text-sm font-semibold text-zinc-100 sm:hidden'
              }
            >
              Thỏa thuận
            </p>
            <ul className="space-y-5">
              {SETTINGS_ROWS.map((row) => (
                <li key={row.key} className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={
                          light
                            ? 'text-sm font-semibold text-slate-900'
                            : 'text-sm font-semibold text-zinc-100'
                        }
                      >
                        {row.title}
                      </p>
                      {row.showInfo ? (
                        <IoInformationCircleOutline
                          className={
                            light ? 'shrink-0 text-base text-slate-400' : 'shrink-0 text-base text-zinc-500'
                          }
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <p
                      className={
                        light
                          ? 'mt-1 text-xs leading-relaxed text-slate-500'
                          : 'mt-1 text-xs leading-relaxed text-zinc-500'
                      }
                    >
                      {row.description}
                    </p>
                  </div>
                  <SettingsSwitch
                    checked={Boolean(draft[row.key])}
                    onChange={(value) => setToggle(row.key, value)}
                    label={row.title}
                    light={light}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={
            light
              ? 'flex shrink-0 justify-end gap-3 border-t border-slate-200 px-5 py-4'
              : 'flex shrink-0 justify-end gap-3 border-t border-zinc-800 px-5 py-4'
          }
        >
          <button
            type="button"
            onClick={handleCancel}
            className={
              light
                ? 'cursor-pointer rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200'
                : 'cursor-pointer rounded-lg bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700'
            }
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold text-white transition ${
              dirty ? 'bg-[#FE2C55] hover:bg-[#e6284c]' : 'cursor-not-allowed bg-[#FE2C55]/50'
            }`}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}
