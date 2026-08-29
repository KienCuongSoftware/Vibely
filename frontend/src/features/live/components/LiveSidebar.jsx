import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  IoArrowBack,
  IoCashOutline,
  IoCheckmarkCircle,
  IoEllipsisHorizontal,
  IoPlayCircleOutline,
  IoTvOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { SidebarMorePanel } from '@/shared/components/SidebarMorePanel.jsx'
import { VibelyMarkIcon, VibelyWordmark } from '@/shared/components/VibelyWordmark.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

function LiveNavItem({ active, icon: Icon, label, onClick, collapsed = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`live-nav-item flex h-10 w-full cursor-pointer items-center rounded-lg text-[15px] transition hover:bg-zinc-900 ${
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-3 text-left'
      } ${
        active
          ? 'live-nav-item--active font-semibold text-[#FE2C55]'
          : 'text-zinc-100'
      }`}
    >
      <Icon className="live-nav-icon shrink-0 text-[22px]" aria-hidden />
      {!collapsed ? <span className="min-w-0 truncate">{label}</span> : null}
    </button>
  )
}

function RecommendedCreatorRow({ creator }) {
  return (
    <button
      type="button"
      className="live-creator-row flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-900"
    >
      <div className="relative shrink-0">
        <img
          src={creator.avatarUrl}
          alt=""
          className="h-10 w-10 rounded-full object-cover ring-2 ring-[#fe2c55]"
          referrerPolicy="no-referrer"
        />
        {creator.isLive ? (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-sm bg-[#fe2c55] px-1 text-[8px] font-bold leading-tight text-white">
            LIVE
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-0.5">
          <span className="truncate text-[13px] font-semibold text-zinc-100">
            {creator.displayName}
          </span>
          {creator.verified ? (
            <IoCheckmarkCircle className="shrink-0 text-sm text-sky-400" aria-hidden />
          ) : null}
        </div>
        <p className="text-[12px] text-zinc-500">
          {formatLiveViewerCount(creator.viewerCount)}
        </p>
      </div>
    </button>
  )
}

export function LiveSidebar({
  activeNav = 'explore',
  recommendedCreators = [],
  token,
  onLogout,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const closeMore = () => setMoreOpen(false)

  const navTo = (path) => {
    closeMore()
    navigate(path)
  }

  return (
    <div className="flex h-full min-h-0 shrink-0 overflow-hidden">
      <aside
        className={`live-sidebar flex h-full shrink-0 flex-col border-r border-zinc-900 bg-black px-3 py-4 transition-[width] duration-200 ease-out ${
          moreOpen ? 'w-[72px]' : 'w-[220px]'
        }`}
      >
        <Link
          to="/"
          className={`mb-4 flex h-11 shrink-0 items-center text-zinc-100 hover:text-white ${
            moreOpen ? 'justify-center pl-0' : 'justify-start pl-1'
          }`}
          onClick={closeMore}
        >
          {moreOpen ? (
            <VibelyMarkIcon className="h-7 w-7 shrink-0 text-zinc-100" />
          ) : (
            <VibelyWordmark className="h-9 w-auto shrink-0 text-zinc-100" />
          )}
        </Link>

        <nav className="space-y-1">
          <LiveNavItem
            collapsed={moreOpen}
            icon={IoArrowBack}
            label={t('nav.back')}
            onClick={() => navTo('/')}
          />
          <LiveNavItem
            collapsed={moreOpen}
            active={!moreOpen && activeNav === 'explore'}
            icon={IoTvOutline}
            label={t('livePage.nav.exploreLive')}
            onClick={() => navTo('/live')}
          />
          <LiveNavItem
            collapsed={moreOpen}
            active={!moreOpen && activeNav === 'goLive'}
            icon={IoVideocamOutline}
            label={t('livePage.nav.goLive')}
            onClick={closeMore}
          />
          <LiveNavItem
            collapsed={moreOpen}
            active={!moreOpen && activeNav === 'creatorTools'}
            icon={IoPlayCircleOutline}
            label={t('livePage.nav.creatorTools')}
            onClick={closeMore}
          />
          <LiveNavItem
            collapsed={moreOpen}
            active={moreOpen}
            icon={IoEllipsisHorizontal}
            label={t('nav.more')}
            onClick={() => setMoreOpen((open) => !open)}
          />
        </nav>

        {!moreOpen ? (
          <>
            <button
              type="button"
              className="live-get-coins mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#fe2c55] px-3 text-[13px] font-semibold text-white transition hover:bg-[#e6284c]"
            >
              <IoCashOutline className="shrink-0 text-base" aria-hidden />
              {t('moreMenu.getCoins')}
            </button>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto scrollbar-none">
              <p className="mb-2 px-2 text-[13px] font-semibold text-zinc-500">
                {t('livePage.recommendedCreators')}
              </p>
              <div className="flex flex-col gap-0.5">
                {recommendedCreators.map((creator) => (
                  <RecommendedCreatorRow key={creator.id} creator={creator} />
                ))}
              </div>
            </div>

            <footer className="mt-4 shrink-0 space-y-1 border-t border-zinc-900 pt-4 text-[11px] leading-relaxed text-zinc-500">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span>{t('nav.company')}</span>
                <span>{t('nav.program')}</span>
              </div>
              <p>{t('nav.termsAndPolicies')}</p>
              <p>{t('nav.copyright')}</p>
            </footer>
          </>
        ) : null}
      </aside>

      {moreOpen ? (
        <SidebarMorePanel
          onClose={closeMore}
          token={token}
          onLogout={onLogout}
        />
      ) : null}
    </div>
  )
}
