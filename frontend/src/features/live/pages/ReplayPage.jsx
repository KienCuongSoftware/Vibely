import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack } from 'react-icons/io5'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LiveReplayPlayer } from '@/features/live/components/player/LiveReplayPlayer.jsx'
import { LiveSpinner, LiveStateView } from '@/features/live/components/LiveStateView.jsx'
import { LIVE_PATHS, LIVE_REPLAY_STATUS } from '@/features/live/constants/liveConstants.js'
import { useLiveReplay } from '@/features/live/hooks/useLiveData.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'
import { RESOURCE_STATUS } from '@/features/live/hooks/useLiveResource.js'
import { formatLiveDuration } from '@/features/live/utils/formatLiveDuration.js'
import { buildProfileVideoUrl } from '@/features/post/utils/videoPublicId.js'

/** While the recording is being produced the page re-checks in the background. */
const PENDING_REFRESH_MS = 15_000
const PENDING = new Set([LIVE_REPLAY_STATUS.RECORDING, LIVE_REPLAY_STATUS.PROCESSING])

const STATUS_KEYS = {
  [LIVE_REPLAY_STATUS.RECORDING]: { title: 'livePage.replay.recordingTitle', body: 'livePage.replay.pendingBody' },
  [LIVE_REPLAY_STATUS.PROCESSING]: { title: 'livePage.replay.processingTitle', body: 'livePage.replay.pendingBody' },
  [LIVE_REPLAY_STATUS.FAILED]: { title: 'livePage.replay.failedTitle', body: null },
  [LIVE_REPLAY_STATUS.DELETED]: { title: 'livePage.replay.deletedTitle', body: null },
}

/**
 * `/replay/:liveId`: the recording of an ended LIVE. The replay is a video of the host; until the
 * host publishes it from Studio only the host can open this page.
 */
export function ReplayPage() {
  const { t } = useTranslation()
  const { liveId } = useParams()
  const { token } = useAuth()
  const { navigate, back } = useLiveNavigation()
  const replay = useLiveReplay({ liveId, token })
  const data = replay.data
  const pending = data && PENDING.has(data.status)
  const { refresh } = replay

  useEffect(() => {
    document.title = data?.title ? t('livePage.replay.pageTitle', { title: data.title }) : t('livePage.replay.title')
  }, [data?.title, t])

  useEffect(() => {
    if (!pending) return undefined
    const id = setInterval(() => void refresh(), PENDING_REFRESH_MS)
    return () => clearInterval(id)
  }, [pending, refresh])

  const header = (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 lg:px-6">
      <button
        type="button"
        onClick={back}
        aria-label={t('nav.back')}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/10"
      >
        <IoArrowBack className="text-xl" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[16px] font-bold">{data?.title || t('livePage.replay.title')}</h1>
        {data?.durationSeconds ? (
          <p className="text-[12px] tabular-nums text-zinc-400">{formatLiveDuration(data.durationSeconds * 1000)}</p>
        ) : null}
      </div>
    </header>
  )

  const body = (() => {
    if (replay.status === RESOURCE_STATUS.LOADING && !data) return <LiveStateView variant="loading" />
    if (replay.status === RESOURCE_STATUS.ERROR || !data) {
      const notFound = replay.error?.status === 404
      return (
        <LiveStateView
          variant="error"
          title={notFound ? t('livePage.replay.notFoundTitle') : undefined}
          description={notFound ? t('livePage.replay.notFoundBody') : t('livePage.states.roomError')}
          actionLabel={notFound ? t('livePage.states.backToDiscovery') : undefined}
          onAction={notFound ? () => navigate(LIVE_PATHS.discovery) : replay.reload}
        />
      )
    }
    if (data.status !== LIVE_REPLAY_STATUS.READY || !data.playbackUrl) {
      const keys = STATUS_KEYS[data.status] ?? STATUS_KEYS[LIVE_REPLAY_STATUS.PROCESSING]
      return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center" role="status">
          {pending ? <LiveSpinner /> : null}
          <p className="text-[15px] font-semibold text-zinc-100">{t(keys.title)}</p>
          {keys.body ? <p className="max-w-sm text-[13px] text-zinc-400">{t(keys.body)}</p> : null}
        </div>
      )
    }

    const videoUrl = buildProfileVideoUrl(data.authorUsername, data.videoId)
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-3 lg:p-6">
        <div className="relative aspect-[9/16] min-h-0 w-full max-w-[420px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <LiveReplayPlayer url={data.playbackUrl} poster={data.thumbnailUrl} onReload={replay.reload} />
        </div>
        {data.isOwner && !data.published ? (
          <div className="flex w-full max-w-[420px] flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900/80 p-4">
            <p className="text-[13px] text-zinc-300">{t('livePage.replay.draftNotice')}</p>
            {data.videoId ? (
              <button
                type="button"
                onClick={() => navigate(`/vibelystudio/upload/post/${encodeURIComponent(data.videoId)}`)}
                className="cursor-pointer rounded-lg bg-[#fe2c55] py-2.5 text-[14px] font-semibold text-white hover:bg-[#e6284c]"
              >
                {t('livePage.replay.publishInStudio')}
              </button>
            ) : null}
          </div>
        ) : null}
        {data.published && videoUrl ? (
          <button
            type="button"
            onClick={() => navigate(videoUrl)}
            className="w-full max-w-[420px] cursor-pointer rounded-lg bg-white/10 py-2.5 text-[14px] font-semibold text-white hover:bg-white/15"
          >
            {t('livePage.replay.openVideo')}
          </button>
        ) : null}
      </div>
    )
  })()

  return (
    <section className="vibely-keep-dark flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-white">
      {header}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{body}</div>
    </section>
  )
}
