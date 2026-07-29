import React, { useEffect, useMemo, useState } from 'react'
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5'
import { useAuth } from '@/store/useAuth'
import {
  loadStudioSettings,
  saveStudioSettings,
  STUDIO_SETTINGS_DEFAULTS,
} from '@/features/studio/utils/studioSettings.js'

const DEFAULT_SETTINGS = STUDIO_SETTINGS_DEFAULTS

const SETTINGS_ROWS = [
  {
    key: 'musicCopyrightCheck',
    title: 'Tự động kiểm tra bản quyền âm nhạc',
    description:
      'Chúng tôi sẽ tự động kiểm tra xem video của bạn có nhạc chưa được cấp phép có thể khiến video bị tắt tiếng hay không.',
    infoTooltip:
      'Chúng tôi sẽ kiểm tra video của bạn để tìm các vi phạm bản quyền tiềm ẩn đối với âm thanh được sử dụng. Nếu phát hiện vi phạm, bạn có thể chỉnh sửa video trước khi đăng.',
    learnMore: 'copyright',
  },
  {
    key: 'contentCheckLite',
    title: 'Tự động kiểm tra nội dung rút gọn',
    description:
      'Chúng tôi sẽ tự động kiểm tra nội dung của bạn để đánh giá khả năng đủ điều kiện xuất hiện trên trang Đề xuất.',
    infoTooltip:
      'Chúng tôi sẽ kiểm tra nhanh video của bạn theo Nguyên tắc Cộng đồng để đảm bảo đủ điều kiện được đề xuất trên trang Đề xuất. Bạn sẽ có cơ hội sửa các vấn đề trước khi đăng. Tuy nhiên, đây chỉ là kiểm tra sơ bộ và không đảm bảo tuân thủ đầy đủ điều khoản và nguyên tắc của chúng tôi.',
  },
  {
    key: 'allowVideoInsights',
    title: 'Cho phép thông tin chi tiết về video của tôi',
    description:
      'Vibely sẽ dùng AI để tóm tắt và phân loại bình luận thành các nhóm: Chủ đề, Cảm hứng, Yêu thích và Câu hỏi.',
  },
  {
    key: 'includeCommentsForInsights',
    title: 'Bao gồm các bình luận của tôi để phân tích',
    description:
      'Vibely sẽ đưa bình luận của bạn vào khi dùng AI để tóm tắt và lọc bình luận trên các video khác.',
  },
]

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

function InfoHoverTip({ text, onLearnMore }) {
  return (
    <span className="group/infotip relative inline-flex shrink-0">
      <button
        type="button"
        className="rounded-full text-zinc-500 transition hover:text-zinc-300 group-hover/infotip:text-zinc-300"
        aria-label="Xem giải thích"
      >
        <IoInformationCircleOutline className="text-base" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-90 w-72 -translate-x-1/2 pt-2 opacity-0 transition-opacity duration-150 group-hover/infotip:pointer-events-auto group-hover/infotip:opacity-100"
      >
        <span className="block rounded-lg bg-zinc-700 px-3 py-2.5 text-left text-xs leading-relaxed font-normal text-white shadow-xl">
          {text}
          {onLearnMore ? (
            <>
              {' '}
              <button
                type="button"
                className="inline cursor-pointer underline underline-offset-2 hover:text-zinc-100"
                onClick={(event) => {
                  event.stopPropagation()
                  onLearnMore()
                }}
              >
                Tìm hiểu thêm
              </button>
            </>
          ) : null}
        </span>
      </span>
    </span>
  )
}

function CopyrightCheckInfoModal({ open, light, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copyright-check-info-title"
        className={
          light
            ? 'w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'
            : 'w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700/80 bg-[#1a1a1a] shadow-2xl'
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-2">
          <h2
            id="copyright-check-info-title"
            className={
              light
                ? 'text-lg font-bold text-slate-900'
                : 'text-lg font-bold text-zinc-100'
            }
          >
            Cách kiểm tra bản quyền hoạt động
          </h2>
        </div>

        <div
          className={
            light
              ? 'space-y-4 px-6 py-2 text-sm leading-relaxed text-slate-700'
              : 'space-y-4 px-6 py-2 text-sm leading-relaxed text-zinc-300'
          }
        >
          <p>
            Hãy chạy kiểm tra bản quyền đối với các âm thanh bạn đã sử dụng trước khi đăng video
            để xác định các vi phạm bản quyền tiềm ẩn. Nếu phát hiện thấy vấn đề, bạn có thể chỉnh
            sửa video của mình trước khi đăng.
          </p>
          <p>
            Bạn vẫn có thể đăng video đã bị gắn cờ vi phạm bản quyền. Tuy nhiên, video sẽ bị tắt
            tiếng để bảo vệ quyền lợi của những âm thanh chưa được cấp phép.
          </p>
          <p>
            <span className={light ? 'font-semibold text-slate-900' : 'font-semibold text-zinc-100'}>
              Lưu ý:
            </span>{' '}
            Kết quả kiểm tra bản quyền không phải là kết quả cuối cùng. Ví dụ: những thay đổi trong
            tương lai về sự cho phép của chủ sở hữu bản quyền đối với âm thanh có thể ảnh hưởng đến
            video của bạn.
          </p>
        </div>

        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-[#FE2C55] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#e6284c]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
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
  const saved = useMemo(() => loadStudioSettings(userId), [userId, open])
  const [draft, setDraft] = useState(saved)
  const [activeNav, setActiveNav] = useState('agreement')
  const [learnMoreKind, setLearnMoreKind] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    setDraft(loadStudioSettings(userId))
    setActiveNav('agreement')
    setLearnMoreKind(null)
  }, [open, userId])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (learnMoreKind) {
        setLearnMoreKind(null)
        return
      }
      onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, learnMoreKind])

  if (!open) return null

  const dirty = SETTINGS_ROWS.some((row) => draft[row.key] !== saved[row.key])

  const handleCancel = () => {
    setDraft(saved)
    onClose?.()
  }

  const handleSave = () => {
    try {
      saveStudioSettings(userId, draft)
    } catch {
      /* ignore quota */
    }
    onClose?.()
  }

  const setToggle = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
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
                      {row.infoTooltip ? (
                        <InfoHoverTip
                          text={row.infoTooltip}
                          onLearnMore={
                            row.learnMore
                              ? () => setLearnMoreKind(row.learnMore)
                              : undefined
                          }
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
    <CopyrightCheckInfoModal
      open={learnMoreKind === 'copyright'}
      light={light}
      onClose={() => setLearnMoreKind(null)}
    />
    </>
  )
}
