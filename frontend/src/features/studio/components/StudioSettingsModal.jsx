import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  loadStudioSettings,
  saveStudioSettings,
  STUDIO_SETTINGS_DEFAULTS,
} from '@/features/studio/utils/studioSettings.js'

const DEFAULT_SETTINGS = STUDIO_SETTINGS_DEFAULTS

const SETTINGS_ROW_KEYS = [
  { key: 'musicCopyrightCheck', learnMore: 'copyright' },
  { key: 'contentCheckLite' },
  { key: 'allowVideoInsights' },
  { key: 'includeCommentsForInsights' },
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

function InfoHoverTip({ text, onLearnMore, viewExplainLabel, learnMoreLabel }) {
  return (
    <span className="group/infotip relative inline-flex shrink-0">
      <button
        type="button"
        className="rounded-full text-zinc-500 transition hover:text-zinc-300 group-hover/infotip:text-zinc-300"
        aria-label={viewExplainLabel}
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
                {learnMoreLabel}
              </button>
            </>
          ) : null}
        </span>
      </span>
    </span>
  )
}

function CopyrightCheckInfoModal({ open, light, onClose, t }) {
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
            {t('studio.settings.copyrightHowTitle')}
          </h2>
        </div>

        <div
          className={
            light
              ? 'space-y-4 px-6 py-2 text-sm leading-relaxed text-slate-700'
              : 'space-y-4 px-6 py-2 text-sm leading-relaxed text-zinc-300'
          }
        >
          <p>{t('studio.settings.copyrightHowP1')}</p>
          <p>{t('studio.settings.copyrightHowP2')}</p>
          <p>
            <span className={light ? 'font-semibold text-slate-900' : 'font-semibold text-zinc-100'}>
              {t('studio.settings.copyrightHowNoteLabel')}
            </span>{' '}
            {t('studio.settings.copyrightHowP3')}
          </p>
        </div>

        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-[#FE2C55] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#e6284c]"
          >
            {t('studio.settings.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal Cài đặt kiểu TikTok Studio — sidebar Thỏa thuận + toggle.
 * @param {boolean} open
 * @param {'dark' | 'light'} [theme='dark']
 * @param {() => void} onClose
 */
export function StudioSettingsModal({ open, theme = 'dark', onClose }) {
  const { t } = useTranslation()
  const light = theme === 'light'
  const { user } = useAuth()
  const userId = user?.id ?? user?.username ?? 'guest'
  const saved = useMemo(() => loadStudioSettings(userId), [userId, open])
  const [draft, setDraft] = useState(saved)
  const [activeNav, setActiveNav] = useState('agreement')
  const [learnMoreKind, setLearnMoreKind] = useState(null)

  const settingsRows = useMemo(
    () =>
      SETTINGS_ROW_KEYS.map((row) => ({
        ...row,
        title: t(`studio.settings.rows.${row.key}.title`),
        description: t(`studio.settings.rows.${row.key}.description`),
        infoTooltip: t(`studio.settings.rows.${row.key}.infoTooltip`, {
          defaultValue: '',
        }),
      })),
    [t],
  )

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

  const dirty = settingsRows.some((row) => draft[row.key] !== saved[row.key])

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
            {t('studio.settings.title')}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className={
              light
                ? 'absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'
                : 'absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100'
            }
            aria-label={t('studio.settings.close')}
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
            aria-label={t('studio.settings.navAria')}
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
              {t('studio.settings.agreement')}
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
              {t('studio.settings.agreement')}
            </p>
            <ul className="space-y-5">
              {settingsRows.map((row) => (
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
                          viewExplainLabel={t('studio.settings.viewExplain')}
                          learnMoreLabel={t('studio.settings.learnMore')}
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
            {t('studio.settings.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold text-white transition ${
              dirty ? 'bg-[#FE2C55] hover:bg-[#e6284c]' : 'cursor-not-allowed bg-[#FE2C55]/50'
            }`}
          >
            {t('studio.settings.save')}
          </button>
        </div>
      </div>
    </div>
    <CopyrightCheckInfoModal
      open={learnMoreKind === 'copyright'}
      light={light}
      onClose={() => setLearnMoreKind(null)}
      t={t}
    />
    </>
  )
}
