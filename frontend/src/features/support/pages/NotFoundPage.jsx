import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IoPlay } from 'react-icons/io5'
import { VibelyWordmark } from '@/shared/components/VibelyWordmark.jsx'
import { FOR_YOU_PATH } from '@/shared/config/routes.js'

const SMILEY_SRC = '/images/404/bbad6f99219877ac47f9.png'

export function NotFoundPage() {
  const { t, i18n } = useTranslation()
  const activeLocale = i18n.resolvedLanguage || i18n.language

  useEffect(() => {
    document.title = t('notFoundPage.pageTitle')
  }, [t, activeLocale])

  return (
    <section
      key={activeLocale}
      className="vibely-chrome vibely-not-found-page flex min-h-dvh flex-col text-[#161823]"
    >
      <header className="not-found-header relative z-10">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center px-4 sm:px-6">
          <Link
            to={FOR_YOU_PATH}
            className="not-found-brand inline-flex items-center text-[#161823]"
            aria-label="Vibely"
          >
            <VibelyWordmark className="h-8 w-auto sm:h-9" />
          </Link>
        </div>
      </header>

      <main className="not-found-hero relative flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6 text-center sm:px-6">
        <div
          className="not-found-code flex items-center justify-center gap-1 sm:gap-2"
          aria-hidden="true"
        >
          <span className="not-found-digit not-found-digit--left">4</span>
          <img
            src={SMILEY_SRC}
            alt=""
            width={168}
            height={168}
            decoding="async"
            className="not-found-smiley"
          />
          <span className="not-found-digit not-found-digit--right">4</span>
        </div>

        <p className="not-found-eyebrow mt-6 text-[14px] font-medium text-[#8a8b91] sm:mt-8 sm:text-[15px]">
          {t('notFoundPage.eyebrow')}
        </p>
        <h1 className="not-found-title mt-2 max-w-[22rem] text-[20px] font-bold leading-snug tracking-tight sm:max-w-xl sm:text-[28px]">
          {t('notFoundPage.title')}
        </h1>

        <Link
          to="/explore"
          className="not-found-cta mt-7 inline-flex items-center justify-center gap-2 rounded-md bg-[#fe2c55] px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#ff4d70] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55] sm:mt-8"
        >
          <IoPlay className="text-[18px]" aria-hidden />
          {t('notFoundPage.cta')}
        </Link>
      </main>

      <footer className="not-found-footer mt-auto border-t border-white/10 bg-[#121212] text-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-12">
          <Link to={FOR_YOU_PATH} className="inline-flex shrink-0 text-white" aria-label="Vibely">
            <VibelyWordmark className="h-8 w-auto" />
          </Link>
          <nav
            aria-label={t('notFoundPage.footerNav')}
            className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-white/70"
          >
            <Link to="/support" className="transition hover:text-white">
              {t('notFoundPage.supportLink')}
            </Link>
            <Link to="/legal/page/row/terms-of-service" className="transition hover:text-white">
              {t('notFoundPage.termsLink')}
            </Link>
            <Link to="/legal/page/row/privacy-policy" className="transition hover:text-white">
              {t('notFoundPage.privacyLink')}
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-[1180px] px-4 py-4 text-[12px] text-white/45 sm:px-6">
            {t('notFoundPage.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </section>
  )
}
