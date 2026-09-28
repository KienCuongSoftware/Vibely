import React from 'react'
import { useTranslation } from 'react-i18next'

export function LiveFieldError({ id, error }) {
  const { t } = useTranslation()
  if (!error) return null
  return (
    <p id={id} className="mt-1.5 text-[12px] font-medium text-[#fe2c55]" role="alert">
      {t(error.key, error.params)}
    </p>
  )
}

export function LiveFormSection({ title, description, children }) {
  return (
    <section className="live-panel rounded-xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
      <h2 className="text-[15px] font-bold text-zinc-100">{title}</h2>
      {description ? <p className="mt-0.5 text-[12px] text-zinc-500">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function LiveCharCounter({ value, max }) {
  const length = String(value ?? '').length
  return (
    <span className={`text-[11px] tabular-nums ${length > max ? 'text-[#fe2c55]' : 'text-zinc-500'}`}>
      {length}/{max}
    </span>
  )
}

export function LiveToggle({ id, label, description, checked, onChange, disabled }) {
  return (
    <label htmlFor={id} className={`flex items-center gap-3 py-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-zinc-100">{label}</span>
        {description ? <span className="block text-[12px] text-zinc-500">{description}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="live-switch relative h-6 w-11 shrink-0 rounded-full bg-zinc-700 transition peer-checked:bg-[#fe2c55] peer-focus-visible:ring-2 peer-focus-visible:ring-[#fe2c55]/60 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
      />
    </label>
  )
}
