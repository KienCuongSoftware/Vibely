import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack } from 'react-icons/io5'
import { LiveCategoryTabs } from '@/features/live/components/LiveCategoryTabs.jsx'
import { LiveDiscoverySkeleton } from '@/features/live/components/LiveDiscoverySkeleton.jsx'
import { LiveHeroPlayer } from '@/features/live/components/LiveHeroPlayer.jsx'
import { LiveSidebar } from '@/features/live/components/LiveSidebar.jsx'
import { LiveStateView } from '@/features/live/components/LiveStateView.jsx'
import { LiveStreamRow } from '@/features/live/components/LiveStreamRow.jsx'
import {
  getLiveCategoryLabelKey,
  LIVE_DISCOVERY,
  LIVE_DISCOVERY_SECTIONS,
  LIVE_FEED_FILTER,
} from '@/features/live/constants/liveConstants.js'
import { useLiveDiscovery } from '@/features/live/hooks/useLiveData.js'
import { useLiveMobileLayout } from '@/features/live/hooks/useLiveMobileLayout.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'
import { RESOURCE_STATUS } from '@/features/live/hooks/useLiveResource.js'
import { availableLiveCategories } from '@/features/live/utils/availableLiveCategories.js'
import { removeFromDiscovery } from '@/features/live/utils/removeFromDiscovery.js'
import { MobileFeedBottomNav } from '@/features/feed/components/MobileFeedShell.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function LivePage() {
  const { t } = useTranslation()
  const { token, logout } = useAuth()
  const { navigate, openLive, goLive, selectSidebarMenu } = useLiveNavigation()
  const [activeCategory, setActiveCategory] = useState(LIVE_FEED_FILTER.RECOMMENDED)
  const isMobile = useLiveMobileLayout()
  const discovery = useLiveDiscovery({ category: activeCategory, token })
  const data = discovery.data
  const { refresh, setData } = discovery
  const removeEndedLive = useCallback(
    (live) => setData((current) => removeFromDiscovery(current, live.id)),
    [setData],
  )
  const allLives = data?.allLives
  const categories = useMemo(() => availableLiveCategories(allLives), [allLives])

  useEffect(() => {
    if (!allLives || activeCategory === LIVE_FEED_FILTER.RECOMMENDED) return
    if (!categories.some((category) => category.id === activeCategory)) {
      setActiveCategory(LIVE_FEED_FILTER.RECOMMENDED)
    }
  }, [allLives, categories, activeCategory])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, LIVE_DISCOVERY.REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    document.title = t('livePage.pageTitle', { category: t(getLiveCategoryLabelKey(activeCategory)) })
  }, [t, activeCategory])

  const sectionsById = new Map((data?.sections ?? []).map((section) => [section.id, section.items]))
  const hasContent = Boolean(
    data?.featured?.length || data?.recommended?.length || data?.sections?.some((section) => section.items.length),
  )

  const renderContent = () => {
    if (discovery.status === RESOURCE_STATUS.LOADING && !data) return <LiveDiscoverySkeleton />
    if (discovery.status === RESOURCE_STATUS.ERROR) {
      return (
        <LiveStateView
          variant="error"
          description={t('livePage.states.discoveryError')}
          onAction={discovery.reload}
        />
      )
    }
    if (!hasContent) {
      return (
        <LiveStateView
          variant="empty"
          description={
            !categories.length
              ? undefined
              : activeCategory === LIVE_FEED_FILTER.FOLLOWING
                ? t('livePage.states.emptyFollowing')
                : t('livePage.states.emptyCategory')
          }
        />
      )
    }
    return (
      <div className={discovery.status === RESOURCE_STATUS.LOADING ? 'opacity-60 transition-opacity' : ''}>
        <LiveHeroPlayer streams={data.featured} onWatch={openLive} onStreamEnded={removeEndedLive} />
        <LiveStreamRow
          title={t('livePage.sections.recommended')}
          streams={data.recommended}
          onSelectStream={openLive}
          onStreamEnded={removeEndedLive}
        />
        {LIVE_DISCOVERY_SECTIONS.map((section) => (
          <LiveStreamRow
            key={section.id}
            title={t(section.titleKey)}
            streams={sectionsById.get(section.id)}
            onSelectStream={openLive}
            onStreamEnded={removeEndedLive}
            onSeeAll={
              activeCategory === section.seeAllCategory
                ? undefined
                : () => setActiveCategory(section.seeAllCategory)
            }
          />
        ))}
      </div>
    )
  }

  return (
    <section className="vibely-live-page flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:flex">
        <LiveSidebar
          activeNav="explore"
          recommendedLives={data?.recommendedHosts ?? []}
          onSelectLive={openLive}
          onGoLive={goLive}
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
            <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold">{t('livePage.nav.exploreLive')}</h1>
            <button
              type="button"
              onClick={goLive}
              className="shrink-0 cursor-pointer rounded-full bg-[#fe2c55] px-3 py-1.5 text-[13px] font-semibold text-white"
            >
              {t('livePage.nav.goLive')}
            </button>
          </header>
        ) : null}

        {categories.length ? (
          <LiveCategoryTabs
            categories={categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        ) : null}

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-6 pt-4 lg:px-6 lg:pb-8 lg:pt-5">
          {renderContent()}
        </div>
      </div>

      {isMobile ? (
        <MobileFeedBottomNav
          active="home"
          onHome={() => navigate('/')}
          onExplore={() => navigate('/explore')}
          onUpload={() => selectSidebarMenu('upload')}
          onInbox={() => selectSidebarMenu('messages')}
          onProfile={() => selectSidebarMenu('profile')}
        />
      ) : null}
    </section>
  )
}
