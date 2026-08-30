import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoCashOutline,
  IoCheckmark,
  IoChevronDown,
  IoDesktopOutline,
  IoDocumentTextOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPhonePortraitOutline,
  IoSearchOutline,
  IoShieldOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ActivityPanel } from '@/features/notification/components/ActivityPanel'
import { useNotificationUnread } from '@/features/notification/store/NotificationUnreadContext'
import { AccountAvatarMenu } from '@/shared/components/AccountAvatarMenu.jsx'
import { AvatarImage } from '@/shared/components/AvatarImage'
import { GuestLoginTrigger } from '@/features/auth/store/GuestAuthUiContext.jsx'
import { useLocale } from '@/i18n/useLocale'
import {
  SUPPORT_CATEGORY_IDS,
  SUPPORT_FAQ_IDS,
} from '@/features/support/data/supportContent.js'

const CATEGORY_ICONS = {
  person: IoPersonOutline,
  phone: IoPhonePortraitOutline,
  video: IoVideocamOutline,
  live: IoDesktopOutline,
  coins: IoCashOutline,
  shield: IoShieldOutline,
}

function normalizeSearch(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function FaqLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="support-faq-link flex cursor-pointer items-start gap-2.5 py-2 text-left text-[15px] leading-snug transition"
    >
      <span className="support-faq-bullet mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fe2c55]" aria-hidden />
      <span>{label}</span>
    </button>
  )
}

function CategoryCard({ title, description, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="support-category-card group relative overflow-hidden rounded-xl border p-5 text-left transition"
    >
      <h3 className="support-category-title relative z-[1] text-[17px] font-bold leading-snug">{title}</h3>
      <p className="support-category-desc relative z-[1] mt-2 max-w-[85%] text-[13px] leading-relaxed">
        {description}
      </p>
      <Icon
        className="support-category-icon pointer-events-none absolute -bottom-1 -right-1 text-[72px] transition"
        aria-hidden
      />
    </button>
  )
}

export function SupportPage() {
  const { t } = useTranslation()
  const { token, user, logout } = useAuth()
  const { unreadCount } = useNotificationUnread()
  const { locale, changeLanguage, languages } = useLocale()
  const [query, setQuery] = useState('')
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const avatarMenuRef = useRef(null)
  const notifRef = useRef(null)
  const langRef = useRef(null)

  useEffect(() => {
    document.title = t('supportPage.pageTitle')
  }, [t])

  useEffect(() => {
    if (!avatarMenuOpen && !notifOpen && !langOpen) return undefined

    const handler = (event) => {
      if (avatarMenuOpen && avatarMenuRef.current?.contains(event.target)) return
      if (notifOpen && notifRef.current?.contains(event.target)) return
      if (langOpen && langRef.current?.contains(event.target)) return
      setAvatarMenuOpen(false)
      setNotifOpen(false)
      setLangOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarMenuOpen, notifOpen, langOpen])

  const normalizedQuery = normalizeSearch(query)

  const faqItems = useMemo(
    () =>
      SUPPORT_FAQ_IDS.map((id) => ({
        id,
        label: t(`supportPage.faq.${id}`),
      })),
    [t],
  )

  const categoryItems = useMemo(
    () =>
      SUPPORT_CATEGORY_IDS.map((item) => ({
        ...item,
        title: t(`supportPage.categories.${item.id}.title`),
        description: t(`supportPage.categories.${item.id}.description`),
        Icon: CATEGORY_ICONS[item.icon] ?? IoDocumentTextOutline,
      })),
    [t],
  )

  const visibleFaqs = useMemo(() => {
    if (!normalizedQuery) return faqItems
    return faqItems.filter((item) => normalizeSearch(item.label).includes(normalizedQuery))
  }, [faqItems, normalizedQuery])

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) return categoryItems
    return categoryItems.filter(
      (item) =>
        normalizeSearch(item.title).includes(normalizedQuery) ||
        normalizeSearch(item.description).includes(normalizedQuery),
    )
  }, [categoryItems, normalizedQuery])

  const faqColumns = useMemo(() => {
    const midpoint = Math.ceil(visibleFaqs.length / 2)
    return [visibleFaqs.slice(0, midpoint), visibleFaqs.slice(midpoint)]
  }, [visibleFaqs])

  const avatarSrc = String(
    user?.avatarUrl || user?.avatar || user?.profileImageUrl || '/images/users/default-avatar.jpeg',
  ).trim()

  const currentLangLabel =
    languages.find((lang) => lang.code === locale)?.nativeLabel ?? locale

  const handleCategorySelect = (title) => {
    setQuery(title)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closePanels = () => {
    setAvatarMenuOpen(false)
    setNotifOpen(false)
    setLangOpen(false)
  }

  return (
    <section className="vibely-chrome vibely-support-page min-h-dvh bg-black text-zinc-100">
      <header className="support-header sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/support" className="support-brand flex shrink-0 items-center gap-2">
            <img src="/vibely-icon.svg" alt="" className="h-8 w-8" />
            <span className="text-[17px] font-bold">{t('supportPage.brand')}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="relative" ref={langRef}>
              <button
                type="button"
                aria-label={t('nav.language')}
                aria-expanded={langOpen}
                onClick={() => {
                  setLangOpen((value) => !value)
                  setNotifOpen(false)
                  setAvatarMenuOpen(false)
                }}
                className="support-lang-btn flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-2 text-sm font-medium transition sm:gap-1.5 sm:px-3"
              >
                <span className="max-w-[7.5rem] truncate sm:max-w-[8rem]">{currentLangLabel}</span>
                <IoChevronDown className="text-sm opacity-70" aria-hidden />
              </button>
              {langOpen ? (
                <div className="support-lang-menu absolute right-0 top-11 z-50 max-h-[min(420px,70dvh)] w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-2xl">
                  <div className="support-lang-menu-header border-b px-4 py-3 text-sm font-bold">
                    {t('settings.languageTitle')}
                  </div>
                  <div className="scrollbar-none max-h-[360px] overflow-y-auto py-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(lang.code)
                          setLangOpen(false)
                        }}
                        className="support-lang-option flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm transition"
                      >
                        <span>{lang.nativeLabel}</span>
                        {locale === lang.code ? (
                          <IoCheckmark className="text-lg text-[#fe2c55]" aria-hidden />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {token ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    aria-label={t('activityPage.title')}
                    aria-expanded={notifOpen}
                    onClick={() => {
                      setNotifOpen((value) => !value)
                      setAvatarMenuOpen(false)
                      setLangOpen(false)
                    }}
                    className="support-icon-btn relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition"
                  >
                    <IoNotificationsOutline className="text-[22px]" aria-hidden />
                    {unreadCount > 0 ? (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notifOpen ? (
                    <div className="absolute right-0 top-11 z-50 h-[min(520px,calc(100dvh-5rem))] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                      <ActivityPanel onClose={() => setNotifOpen(false)} />
                    </div>
                  ) : null}
                </div>

                <div className="relative" ref={avatarMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen((value) => !value)
                      setNotifOpen(false)
                      setLangOpen(false)
                    }}
                    className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-zinc-600"
                    aria-label={t('common.accountMenu')}
                    aria-expanded={avatarMenuOpen}
                  >
                    <AvatarImage
                      src={avatarSrc}
                      alt={user?.displayName || 'avatar'}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <AccountAvatarMenu
                    open={avatarMenuOpen}
                    onClose={() => setAvatarMenuOpen(false)}
                    user={user}
                    token={token}
                    onLogout={() => {
                      closePanels()
                      logout()
                    }}
                    className="absolute right-0 top-11 z-50"
                  />
                </div>
              </>
            ) : (
              <GuestLoginTrigger className="cursor-pointer rounded-full bg-[#fe2c55] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#ea284f]">
                {t('nav.login')}
              </GuestLoginTrigger>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-[760px] text-center">
          <h1 className="support-hero-title text-[28px] font-bold leading-tight sm:text-[32px]">
            {t('supportPage.heroTitle')}
          </h1>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="support-search-field relative flex min-w-0 flex-1 items-center rounded-full px-4 py-3">
              <IoSearchOutline className="support-search-icon shrink-0 text-xl" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('supportPage.searchPlaceholder')}
                className="support-search-input min-w-0 flex-1 bg-transparent pl-3 text-[15px] outline-none"
              />
            </label>
            <button
              type="button"
              className="support-ticket-btn inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-3 text-[14px] font-semibold transition"
            >
              <IoDocumentTextOutline className="text-lg" aria-hidden />
              {t('supportPage.supportTicket')}
            </button>
          </div>
        </div>

        {visibleFaqs.length > 0 ? (
          <section className="mt-12 sm:mt-14">
            <h2 className="support-section-title text-[20px] font-bold">{t('supportPage.faqTitle')}</h2>
            <div className="mt-4 grid grid-cols-1 gap-x-10 md:grid-cols-2">
              {faqColumns.map((column, columnIndex) => (
                <div key={columnIndex}>
                  {column.map((item) => (
                    <FaqLink
                      key={item.id}
                      label={item.label}
                      onClick={() => setQuery(item.label)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {visibleCategories.length > 0 ? (
          <section className="mt-12 sm:mt-14">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCategories.map((item) => (
                <CategoryCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={item.Icon}
                  onClick={() => handleCategorySelect(item.title)}
                />
              ))}
            </div>

            {!normalizedQuery ? (
              <div className="mt-6 flex justify-end">
                <button type="button" className="support-more-link cursor-pointer text-[15px] font-semibold transition">
                  {t('supportPage.seeMoreTopics')}
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="support-muted mt-12 text-center text-[15px]">{t('supportPage.noResults')}</p>
        )}

        <div className="support-footer mt-14 flex flex-wrap items-center justify-center gap-4 border-t pt-8 text-[13px]">
          <Link to="/legal/page/row/terms-of-service" className="support-footer-link transition">
            {t('supportPage.termsLink')}
          </Link>
          <span className="support-muted" aria-hidden>
            ·
          </span>
          <Link to="/legal/page/row/privacy-policy" className="support-footer-link transition">
            {t('supportPage.privacyLink')}
          </Link>
        </div>
      </main>
    </section>
  )
}
