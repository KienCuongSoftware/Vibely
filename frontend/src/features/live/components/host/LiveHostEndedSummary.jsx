import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoHeart } from 'react-icons/io5'
import { LIVE_PATHS } from '@/features/live/constants/liveConstants.js'
import { useLiveAnalytics } from '@/features/live/hooks/useLiveData.js'
import { endReasonMessageKey } from '@/features/live/media/mediaErrorMessages.js'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'
import { formatLiveDuration } from '@/features/live/utils/formatLiveDuration.js'

function Stat({ label, children }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <dt className="text-[11px] text-zinc-400">{label}</dt>
      <dd className="inline-flex items-center gap-1 text-[17px] font-bold tabular-nums">{children}</dd>
    </div>
  )
}

/**
 * Shown to the host once the LIVE is over: the stored analytics when available (the live
 * counters otherwise) and, for a recorded LIVE, a link to the replay.
 */
export function LiveHostEndedSummary({ live, token, viewerCount, onExit, onNavigate }) {
  const { t } = useTranslation()
  const analytics = useLiveAnalytics({ liveId: live.id, token }).data
  const reasonKey = endReasonMessageKey(analytics?.endReason ?? live.endReason)

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/75 px-6 py-6">
      <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-5 text-center">
        <h2 className="text-[17px] font-bold">{t('livePage.host.endedTitle')}</h2>
        {reasonKey ? <p className="mt-2 text-[12px] text-zinc-400">{t(reasonKey)}</p> : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-left">
          <Stat label={t('livePage.host.summaryViewers')}>
            {formatLiveViewerCount(analytics ? analytics.uniqueViewers : viewerCount)}
          </Stat>
          <Stat label={t('livePage.host.summaryLikes')}>
            <IoHeart className="text-[#fe2c55]" aria-hidden />
            {formatLiveViewerCount(analytics ? analytics.likeCount : live.likeCount)}
          </Stat>
          {analytics ? (
            <>
              <Stat label={t('livePage.host.summaryDuration')}>{formatLiveDuration(analytics.durationSeconds * 1000)}</Stat>
              <Stat label={t('livePage.host.summaryPeakViewers')}>{formatLiveViewerCount(analytics.peakViewers)}</Stat>
              <Stat label={t('livePage.host.summaryAverageWatch')}>
                {formatLiveDuration(analytics.averageWatchSeconds * 1000)}
              </Stat>
              <Stat label={t('livePage.host.summaryComments')}>{formatLiveViewerCount(analytics.commentCount)}</Stat>
            </>
          ) : null}
        </dl>
        {live.recordingEnabled ? (
          <button
            type="button"
            onClick={() => onNavigate(LIVE_PATHS.replay(live.id))}
            className="mt-5 w-full cursor-pointer rounded-lg bg-white/10 py-2.5 text-[14px] font-semibold hover:bg-white/15"
          >
            {t('livePage.replay.watchReplay')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onExit}
          className={`${live.recordingEnabled ? 'mt-2' : 'mt-5'} w-full cursor-pointer rounded-lg bg-[#fe2c55] py-2.5 text-[14px] font-semibold hover:bg-[#e6284c]`}
        >
          {t('livePage.states.backToDiscovery')}
        </button>
      </div>
    </div>
  )
}
