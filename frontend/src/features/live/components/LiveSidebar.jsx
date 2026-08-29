import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoEllipsisHorizontal,
  IoPlayCircleOutline,
  IoTvOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { VibelyWordmark } from '@/shared/components/VibelyWordmark.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

function CoinIcon({ className = 'text-base' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 4.5c3.6 0 6.5 2.2 6.5 5s-2.9 5-6.5 5h-2v2.5H8v-2.5H6.5C2.9 14.5 0 12.3 0 9.5S2.9 4.5 6.5 4.5H8V2h2v2.5h2zm-3.5 5c0 1.4 1.6 2.5 3.5 2.5s3.5-1.1 3.5-2.5S13.4 7 11.5 7 8 8.1 8 9.5z" />
    </svg>
  )
}

function LiveNavItem({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`live-nav-item flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold transition ${
        active
          ? 'live-nav-item--active bg-white/10 text-[#fe2c55]'
          : 'text-zinc-100 hover:bg-white/5'
      }`}
    >
      <Icon
        className={`live-nav-icon shrink-0 text-[22px] ${active ? 'text-[#fe2c55]' : 'text-zinc-100'}`}
        aria-hidden
      />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

function RecommendedCreatorRow({ creator }) {
  return (
    <button
      type="button"
      className="live-creator-row flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
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

export function LiveSidebar({ activeNav = 'explore', recommendedCreators = [] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <aside className="live-sidebar flex h-full w-[240px] shrink-0 flex-col border-r border-white/10 bg-black px-3 py-4 xl:w-[260px]">
      <Link to="/" className="mb-5 inline-flex shrink-0 px-1">
        <VibelyWordmark className="h-8 w-auto text-zinc-100" />
      </Link>

      <nav className="flex flex-col gap-0.5">
        <LiveNavItem
          icon={IoArrowBack}
          label={t('nav.back')}
          onClick={() => navigate('/')}
        />
        <LiveNavItem
          active={activeNav === 'explore'}
          icon={IoTvOutline}
          label={t('livePage.nav.exploreLive')}
          onClick={() => navigate('/live')}
        />
        <LiveNavItem
          active={activeNav === 'goLive'}
          icon={IoVideocamOutline}
          label={t('livePage.nav.goLive')}
          onClick={() => {}}
        />
        <LiveNavItem
          active={activeNav === 'creatorTools'}
          icon={IoPlayCircleOutline}
          label={t('livePage.nav.creatorTools')}
          onClick={() => {}}
        />
        <LiveNavItem
          active={activeNav === 'more'}
          icon={IoEllipsisHorizontal}
          label={t('nav.more')}
          onClick={() => {}}
        />
      </nav>

      <button
        type="button"
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fe2c55] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#e6284c]"
      >
        <CoinIcon className="text-lg" />
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

      <footer className="mt-4 shrink-0 space-y-1 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-zinc-500">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <span>{t('nav.company')}</span>
          <span>{t('nav.program')}</span>
        </div>
        <p>{t('nav.termsAndPolicies')}</p>
        <p>{t('nav.copyright')}</p>
      </footer>
    </aside>
  )
}
