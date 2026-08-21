import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoCheckmarkCircle, IoInformationCircleOutline, IoWarningOutline } from 'react-icons/io5'

function CheckSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${
        checked ? 'bg-teal-400' : 'bg-zinc-600'
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

function CheckInfoTip({ text, viewExplainLabel }) {
  return (
    <span className="group/checktip relative inline-flex shrink-0">
      <button
        type="button"
        className="rounded-full text-zinc-500 transition hover:text-zinc-300 group-hover/checktip:text-zinc-300"
        aria-label={viewExplainLabel}
      >
        <IoInformationCircleOutline className="text-base" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-72 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/checktip:pointer-events-auto group-hover/checktip:opacity-100"
      >
        <span className="block rounded-lg bg-zinc-700 px-3 py-2.5 text-left text-xs leading-relaxed font-normal text-white shadow-xl">
          {text}
        </span>
        <span className="mx-auto -mt-px block h-2.5 w-2.5 rotate-45 bg-zinc-700" aria-hidden />
      </span>
    </span>
  )
}

function CheckStatusRow({ tone, children }) {
  const textClass =
    tone === 'ok'
      ? 'text-emerald-400'
      : tone === 'pending'
        ? 'text-zinc-400'
        : tone === 'warn' || tone === 'danger'
          ? 'text-red-400'
          : 'text-zinc-500'

  return (
    <div className={`mt-2 flex items-start gap-2 text-xs leading-relaxed ${textClass}`}>
      {tone === 'ok' ? (
        <IoCheckmarkCircle className="mt-0.5 shrink-0 text-base text-emerald-400" aria-hidden />
      ) : tone === 'pending' ? (
        <span
          className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200"
          aria-hidden
        />
      ) : tone === 'warn' || tone === 'danger' ? (
        <IoWarningOutline className="mt-0.5 shrink-0 text-base text-red-500" aria-hidden />
      ) : null}
      <p className="min-w-0">{children}</p>
    </div>
  )
}

/** TikTok Studio–style Checks block (dark Studio theme). */
export function UploadChecksPanel({
  musicCopyrightCheck,
  contentCheckLite,
  onToggleMusic,
  onToggleContent,
  originalityCheck,
  onOpenDetails,
}) {
  const { t } = useTranslation()
  const viewExplain = t('upload.checks.viewExplain')

  return (
    <div className="mt-8">
      <h3 className="text-base font-bold text-zinc-100">{t('upload.checks.title')}</h3>
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-4">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-sm font-semibold text-zinc-100">
                  {t('upload.checks.musicCopyright')}
                </p>
                <CheckInfoTip
                  viewExplainLabel={viewExplain}
                  text={t('upload.checks.musicCopyrightTip')}
                />
              </div>
              <CheckSwitch
                checked={Boolean(musicCopyrightCheck)}
                onChange={onToggleMusic}
                label={t('upload.checks.musicCopyrightAria')}
              />
            </div>
            {musicCopyrightCheck ? (
              <CheckStatusRow tone="ok">{t('upload.checks.noIssues')}</CheckStatusRow>
            ) : (
              <CheckStatusRow tone="off">{t('upload.checks.musicOff')}</CheckStatusRow>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-sm font-semibold text-zinc-100">
                  {t('upload.checks.contentLite')}
                </p>
                <CheckInfoTip
                  viewExplainLabel={viewExplain}
                  text={t('upload.checks.contentLiteTip')}
                />
              </div>
              <CheckSwitch
                checked={Boolean(contentCheckLite)}
                onChange={onToggleContent}
                label={t('upload.checks.contentLiteAria')}
              />
            </div>
            {contentCheckLite ? (
              originalityCheck ? (
                <CheckStatusRow tone={originalityCheck.tone}>
                  {originalityCheck.detail}
                  {originalityCheck.showDetails ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-sky-400 underline decoration-sky-400/80 underline-offset-2 hover:text-sky-300"
                        onClick={onOpenDetails}
                      >
                        {t('upload.checks.viewDetails')}
                      </button>
                    </>
                  ) : null}
                </CheckStatusRow>
              ) : (
                <CheckStatusRow tone="pending">
                  {t('upload.checks.runsAfterUpload')}
                </CheckStatusRow>
              )
            ) : (
              <CheckStatusRow tone="off">{t('upload.checks.contentOff')}</CheckStatusRow>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
