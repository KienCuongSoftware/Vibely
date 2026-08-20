import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack, IoDownloadOutline } from 'react-icons/io5'

export const DATA_EXPORT_CATEGORIES = [
  { id: 'reviews', labelKey: 'settings.dataExport.categories.reviews' },
  { id: 'posts', labelKey: 'settings.dataExport.categories.posts' },
  { id: 'comments', labelKey: 'settings.dataExport.categories.comments' },
  {
    id: 'activity',
    labelKey: 'settings.dataExport.categories.activity',
    descriptionKey: 'settings.dataExport.categories.activityDesc',
  },
  { id: 'profile', labelKey: 'settings.dataExport.categories.profile' },
  { id: 'likes', labelKey: 'settings.dataExport.categories.likes' },
  { id: 'live', labelKey: 'settings.dataExport.categories.live' },
  { id: 'shop', labelKey: 'settings.dataExport.categories.shop' },
  { id: 'direct_messages', labelKey: 'settings.dataExport.categories.direct_messages' },
  { id: 'income', labelKey: 'settings.dataExport.categories.income' },
]

function formatExportDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(locale || undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Trang Tải về dữ liệu Vibely — tab Yêu cầu / Tải về (kiểu TikTok).
 */
export function DownloadYourDataPanel({
  requests = [],
  loading = false,
  submitting = false,
  error = '',
  onBack,
  onSubmit,
  onCancel,
}) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('request')
  const [format, setFormat] = useState('TXT')
  const [selected, setSelected] = useState(() => new Set())

  const processing = useMemo(
    () => requests.find((item) => item.status === 'PROCESSING') || null,
    [requests],
  )
  const pastRequests = useMemo(
    () => requests.filter((item) => item.status !== 'PROCESSING'),
    [requests],
  )

  const allSelected = selected.size === DATA_EXPORT_CATEGORIES.length
  const formats = [
    { id: 'TXT', label: 'TXT', helpKey: 'settings.dataExport.formatTxtHelp' },
    { id: 'JSON', label: 'JSON', helpKey: 'settings.dataExport.formatJsonHelp' },
  ]

  const toggleCategory = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(DATA_EXPORT_CATEGORIES.map((item) => item.id)))
  }

  const canSubmit = selected.size > 0 && !submitting && !processing

  const currentRequestBlock = processing ? (
    <div className="rounded-xl bg-zinc-900/80 px-4 py-4">
      <p className="text-sm font-semibold text-zinc-100">{t('settings.dataExport.currentRequest')}</p>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-950/80 px-3 py-3">
        <div>
          <p className="text-sm text-zinc-100">
            {t('settings.dataExport.requestedOn', {
              date: formatExportDate(processing.createdAt, i18n.language),
            })}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t('settings.dataExport.allData')}</p>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onCancel?.(processing.id)}
          className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
      </div>
      {tab === 'request' && pastRequests.length > 0 ? (
        <p className="mt-4 text-sm font-semibold text-zinc-100">
          {t('settings.dataExport.previousRequests')}
        </p>
      ) : null}
    </div>
  ) : null

  return (
    <div className="flex min-h-[520px] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
        aria-label={t('common.back')}
      >
        <IoArrowBack className="text-xl" aria-hidden />
      </button>

      <h1 className="text-2xl font-bold text-zinc-100">{t('settings.dataExport.title')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t('settings.dataExport.intro')}</p>

      <div className="mt-6 flex border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setTab('request')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
            tab === 'request'
              ? 'border-b-2 border-zinc-100 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {t('settings.dataExport.tabRequest')}
        </button>
        <button
          type="button"
          onClick={() => setTab('downloads')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
            tab === 'downloads'
              ? 'border-b-2 border-zinc-100 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {t('settings.dataExport.tabDownloads')}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      {tab === 'request' ? (
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          {processing ? (
            currentRequestBlock
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-100">{t('settings.dataExport.chooseFormat')}</p>
              <div className="mt-2 space-y-1">
                {formats.map((item) => {
                  const checked = format === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-zinc-900"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">{t(item.helpKey)}</span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          checked ? 'border-red-500' : 'border-zinc-500'
                        }`}
                        aria-hidden
                      >
                        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{t('settings.dataExport.chooseData')}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{t('settings.dataExport.chooseDataHint')}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-zinc-900/70 px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">Vibely</span>
                    <span className="text-xs text-zinc-500">
                      {t('settings.dataExport.selectedCount', {
                        selected: selected.size,
                        total: DATA_EXPORT_CATEGORIES.length,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-sm font-semibold text-red-400 transition hover:text-red-300"
                  >
                    {allSelected
                      ? t('settings.dataExport.deselectAll')
                      : t('settings.dataExport.selectAll')}
                  </button>
                </div>
                <ul className="max-h-[320px] space-y-1 overflow-y-auto scrollbar-none">
                  {DATA_EXPORT_CATEGORIES.map((item) => {
                    const checked = selected.has(item.id)
                    return (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-800/70">
                          <span className="min-w-0">
                            <span className="block text-sm text-zinc-100">{t(item.labelKey)}</span>
                            {item.descriptionKey ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                                {t(item.descriptionKey)}
                              </span>
                            ) : null}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(item.id)}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-red-500"
                          />
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          <button
            type="button"
            disabled={!canSubmit && !processing}
            onClick={() => {
              if (processing) return
              onSubmit?.({ format, categories: [...selected] })
              setTab('downloads')
            }}
            className={`mt-auto w-full rounded-md px-4 py-3 text-sm font-semibold transition ${
              processing
                ? 'cursor-not-allowed bg-red-500/40 text-white/80'
                : canSubmit
                  ? 'bg-red-500 text-white hover:bg-red-500/90'
                  : 'cursor-not-allowed bg-red-500/35 text-white/70'
            }`}
          >
            {processing
              ? t('settings.dataExport.processingRequest')
              : submitting
                ? t('settings.dataExport.submitting')
                : t('settings.dataExport.requestData')}
          </button>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col">
          {loading ? (
            <p className="text-center text-sm text-zinc-500">{t('common.loading')}</p>
          ) : processing ? (
            currentRequestBlock
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <IoDownloadOutline className="text-5xl text-zinc-600" aria-hidden />
              <p className="mt-4 text-base font-semibold text-zinc-100">
                {t('settings.dataExport.emptyTitle')}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{t('settings.dataExport.emptyHint')}</p>
              <button
                type="button"
                onClick={() => setTab('request')}
                className="mt-8 rounded-md bg-red-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90"
              >
                {t('settings.dataExport.requestData')}
              </button>
            </div>
          )}

          {processing ? (
            <button
              type="button"
              disabled
              className="mt-auto w-full cursor-not-allowed rounded-md bg-red-500/40 px-4 py-3 text-sm font-semibold text-white/80"
            >
              {t('settings.dataExport.processingRequest')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
