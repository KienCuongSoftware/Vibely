import React from 'react'
import { useTranslation } from 'react-i18next'

function DeviceSelect({ id, label, devices, value, onChange }) {
  if (!devices?.length) return null
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span className="shrink-0 text-zinc-300">{label}</span>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 max-w-[60%] cursor-pointer truncate rounded-md bg-white/10 px-2 py-1 text-[12px] text-white outline-none focus:ring-1 focus:ring-white/30"
      >
        {value ? null : <option value="" disabled>—</option>}
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId} className="bg-zinc-900">
            {device.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Camera and microphone pickers bound to a host media controller (see useHostMedia). */
export function LiveDeviceSelects({ media, idPrefix }) {
  const { t } = useTranslation()
  const { devices, selectedDeviceIds } = media.state
  return (
    <>
      <DeviceSelect
        id={`${idPrefix}-camera`}
        label={t('livePage.media.devices.camera')}
        devices={devices?.videoinput}
        value={selectedDeviceIds?.videoinput}
        onChange={(deviceId) => void media.switchDevice('videoinput', deviceId)}
      />
      <DeviceSelect
        id={`${idPrefix}-microphone`}
        label={t('livePage.media.devices.microphone')}
        devices={devices?.audioinput}
        value={selectedDeviceIds?.audioinput}
        onChange={(deviceId) => void media.switchDevice('audioinput', deviceId)}
      />
    </>
  )
}
