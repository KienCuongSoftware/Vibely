import React from 'react'
import { IoChevronForward, IoMegaphoneOutline } from 'react-icons/io5'

export function ActivitySystemInboxRow({ preview, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.()}
      className="mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-zinc-900/90"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2b3a4f]">
        <IoMegaphoneOutline className="text-base text-white" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-tight text-white">
          Thông báo hệ thống
        </p>
        {preview ? (
          <p className="mt-0.5 truncate text-[11px] leading-snug text-zinc-500">
            {preview}
          </p>
        ) : null}
      </div>
      <IoChevronForward className="shrink-0 text-base text-zinc-600" aria-hidden />
    </button>
  )
}
