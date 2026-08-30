import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoCashOutline,
  IoChatbubbleEllipsesOutline,
  IoDesktopOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoPhonePortraitOutline,
  IoSearchOutline,
  IoShieldOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AccountAvatarMenu } from '@/shared/components/AccountAvatarMenu.jsx'
import { AvatarImage } from '@/shared/components/AvatarImage'
import { GuestLoginTrigger } from '@/features/auth/store/GuestAuthUiContext.jsx'
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
      className="support-faq-link flex cursor-pointer items-start gap-2.5 py-2 text-left text-[15px] leading-snug text-[#161823] transition hover:text-[#fe2c55]"
    >
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fe2c55]" aria-hidden />
      <span>{label}</span>
    </button>
  )
}

function CategoryCard({ title, description, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="support-category-card group relative overflow-hidden rounded-xl border border-[#e3e3e4] bg-white p-5 text-left transition hover:border-[#d4d4d8] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <h3 className="relative z-[1] text-[17px] font-bold leading-snug text-[#161823]">{title}</h3>
      <p className="relative z-[1] mt-2 max-w-[85%] text-[13px] leading-relaxed text-[#757575]">
        {description}
      </p>
      <Icon
        className="pointer-events-none absolute -bottom-1 -right-1 text-[72px] text-[#f1f1f2] transition group-hover:text-[#ebebec]"
        aria-hidden
      />
    </button>
  )
}

export function SupportPage() {
  const { t } = useTranslation()
  const { token, user, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef(null)

  useEffect(() => {
    document.title = t('supportPage.pageTitle')
  }, [t])

  useEffect(() => {
    if (!avatarMenuOpen) return undefined
    const handler = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarMenuOpen])

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

  const handleCategorySelect = (title) => {
    setQuery(title)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="vibely-support-page min-h-dvh bg-white text-[#161823]">
      <header className="sticky top-0 z-40 border-b border-[#e3e3e4] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/support" className="flex shrink-0 items-center gap-2">
            <img src="/vibely-icon.svg" alt="" className="h-8 w-8" />
            <span className="text-[17px] font-bold text-[#161823]">{t('supportPage.brand')}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t('supportPage.feedback')}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#161823] transition hover:bg-[#f1f1f2]"
            >
              <IoChatbubbleEllipsesOutline className="text-[22px]" aria-hidden />
            </button>

            {token ? (
              <div className="relative" ref={avatarMenuRef}>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen((value) => !value)}
                  className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-[#e3e3e4]"
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
                  onLogout={logout}
                  className="absolute right-0 top-11 z-50 border-[#e3e3e4] bg-white shadow-xl"
                />
              </div>
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
          <h1 className="text-[28px] font-bold leading-tight text-[#161823] sm:text-[32px]">
            {t('supportPage.heroTitle')}
          </h1>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="support-search-field relative flex min-w-0 flex-1 items-center rounded-full bg-[#f1f1f2] px-4 py-3">
              <IoSearchOutline className="shrink-0 text-xl text-[#757575]" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('supportPage.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent pl-3 text-[15px] text-[#161823] outline-none placeholder:text-[#757575]"
              />
            </label>
            <button
              type="button"
              className="support-ticket-btn inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d4d4d8] bg-white px-5 py-3 text-[14px] font-semibold text-[#161823] transition hover:bg-[#fafafa]"
            >
              <IoDocumentTextOutline className="text-lg" aria-hidden />
              {t('supportPage.supportTicket')}
            </button>
          </div>
        </div>

        {visibleFaqs.length > 0 ? (
          <section className="mt-12 sm:mt-14">
            <h2 className="text-[20px] font-bold text-[#161823]">{t('supportPage.faqTitle')}</h2>
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
                <button
                  type="button"
                  className="cursor-pointer text-[15px] font-semibold text-[#161823] transition hover:text-[#fe2c55]"
                >
                  {t('supportPage.seeMoreTopics')}
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="mt-12 text-center text-[15px] text-[#757575]">{t('supportPage.noResults')}</p>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4 border-t border-[#e3e3e4] pt-8 text-[13px] text-[#757575]">
          <Link to="/legal/page/row/terms-of-service" className="hover:text-[#161823]">
            {t('supportPage.termsLink')}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/legal/page/row/privacy-policy" className="hover:text-[#161823]">
            {t('supportPage.privacyLink')}
          </Link>
        </div>
      </main>
    </div>
  )
}
