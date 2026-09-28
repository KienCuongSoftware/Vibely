import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  IoMic,
  IoMicOffOutline,
  IoSettingsOutline,
  IoVideocam,
  IoVideocamOffOutline,
} from 'react-icons/io5'
import { LiveSpinner } from '@/features/live/components/LiveStateView.jsx'
import { LIVE_STATUS } from '@/features/live/constants/liveConstants.js'

function ControlButton({ label, active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-[#fe2c55]/20 text-[#fe2c55] hover:bg-[#fe2c55]/30'
      }`}
    >
      {children}
    </button>
  )
}

/** Mic / camera / settings toggles and the primary start-or-end action. */
export function LiveHostControls({
  status,
  micEnabled,
  cameraEnabled,
  mediaReady,
  onToggleMic,
  onToggleCamera,
  onOpenSettings,
  settingsOpen,
  onStart,
  onEnd,
  action,
}) {
  const { t } = useTranslation()
  const isLive = status === LIVE_STATUS.LIVE
  const isEnded = status === LIVE_STATUS.ENDED

  return (
    <div className="flex items-center gap-3">
      <ControlButton
        label={micEnabled ? t('livePage.host.muteMic') : t('livePage.host.unmuteMic')}
        active={micEnabled}
        onClick={onToggleMic}
        disabled={!mediaReady || isEnded}
      >
        {micEnabled ? <IoMic className="text-xl" aria-hidden /> : <IoMicOffOutline className="text-xl" aria-hidden />}
      </ControlButton>
      <ControlButton
        label={cameraEnabled ? t('livePage.host.turnOffCamera') : t('livePage.host.turnOnCamera')}
        active={cameraEnabled}
        onClick={onToggleCamera}
        disabled={!mediaReady || isEnded}
      >
        {cameraEnabled ? <IoVideocam className="text-xl" aria-hidden /> : <IoVideocamOffOutline className="text-xl" aria-hidden />}
      </ControlButton>
      <ControlButton label={t('livePage.host.settings')} active onClick={onOpenSettings} disabled={isEnded}>
        <IoSettingsOutline className={`text-xl ${settingsOpen ? 'text-[#fe2c55]' : ''}`} aria-hidden />
      </ControlButton>

      {isEnded ? null : (
        <button
          type="button"
          onClick={isLive ? onEnd : onStart}
          disabled={Boolean(action)}
          className={`ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-bold text-white transition disabled:cursor-wait disabled:opacity-70 ${
            isLive ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-[#fe2c55] hover:bg-[#e6284c]'
          }`}
        >
          {action ? <LiveSpinner className="h-4 w-4" /> : null}
          {isLive ? t('livePage.host.endLive') : t('livePage.host.goLive')}
        </button>
      )}
    </div>
  )
}
