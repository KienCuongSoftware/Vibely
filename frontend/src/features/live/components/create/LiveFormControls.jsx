import React from 'react'

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
