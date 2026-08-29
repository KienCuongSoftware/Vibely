import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { LiveCategoryTabs } from '@/features/live/components/LiveCategoryTabs.jsx'
import { LiveHeroPlayer } from '@/features/live/components/LiveHeroPlayer.jsx'
import { LiveSidebar } from '@/features/live/components/LiveSidebar.jsx'
import { LiveStreamRow } from '@/features/live/components/LiveStreamRow.jsx'
import {
  LIVE_CATEGORIES,
  LIVE_GAMING_STREAMS,
  LIVE_HERO_STREAMS,
  LIVE_LIFESTYLE_STREAMS,
  LIVE_RECOMMENDED_CREATORS,
} from '@/features/live/data/liveMockData.js'
import {
  isMobileFeedLayout,
  MobileFeedBottomNav,
} from '@/features/feed/components/MobileFeedShell.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { handleSidebarMenuSelect } from '@/shared/utils/sidebarNavigation.js'

export function LivePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user, logout } = useAuth()
  const [activeCategory, setActiveCategory] = useState('recommended')
  const isMobile = isMobileFeedLayout()

  useEffect(() => {
    document.title = t('livePage.pageTitle')
  }, [t])

  const handleSelectMenu = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: user?.username ? `/@${user.username}` : '/profile',
      onActivity: () => navigate('/?openActivity=1'),
    })
  }

  return (
    <section className="vibely-live-page flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:flex">
        <LiveSidebar
          activeNav="explore"
          recommendedCreators={LIVE_RECOMMENDED_CREATORS}
          token={token}
          onLogout={token ? logout : undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isMobile ? (
          <header className="live-mobile-header flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label={t('nav.back')}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-100 transition hover:bg-white/10"
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <h1 className="text-[17px] font-bold">{t('livePage.nav.exploreLive')}</h1>
          </header>
        ) : null}

        <LiveCategoryTabs
          categories={LIVE_CATEGORIES}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-6 pt-4 lg:px-6 lg:pb-8 lg:pt-5">
          <LiveHeroPlayer streams={LIVE_HERO_STREAMS} />

          <LiveStreamRow
            title={t('livePage.sections.gaming')}
            streams={LIVE_GAMING_STREAMS}
          />

          <LiveStreamRow
            title={t('livePage.sections.lifestyle')}
            streams={LIVE_LIFESTYLE_STREAMS}
          />
        </div>
      </div>

      {isMobile ? (
        <MobileFeedBottomNav
          active="home"
          onHome={() => navigate('/')}
          onExplore={() => navigate('/explore')}
          onUpload={() =>
            handleSidebarMenuSelect(navigate, 'upload', { token })
          }
          onInbox={() =>
            handleSidebarMenuSelect(navigate, 'messages', { token })
          }
          onProfile={() =>
            handleSidebarMenuSelect(navigate, 'profile', {
              token,
              profilePath: user?.username ? `/@${user.username}` : '/profile',
            })
          }
        />
      ) : null}
    </section>
  )
}
