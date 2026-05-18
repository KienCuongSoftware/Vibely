import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IoCalendarOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** @returns {string} yyyy-mm-dd */
function toIsoLocal(y, monthIndex, day) {
  return `${y}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

function dateToIso(d) {
  return toIsoLocal(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseIsoLocal(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, day] = iso.split('-').map(Number)
  if (!y || !m || !day) return null
  return new Date(y, m - 1, day)
}

function formatDisplay(iso) {
  if (!iso) return '…'
  const d = parseIsoLocal(iso)
  if (!d || Number.isNaN(d.getTime())) return '…'
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

function cmpIso(a, b) {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  return a.localeCompare(b)
}

function clampIso(iso, minIso, maxIso) {
  if (!iso) return iso
  let x = iso
  if (minIso && cmpIso(x, minIso) < 0) x = minIso
  if (maxIso && cmpIso(x, maxIso) > 0) x = maxIso
  return x
}

/** Ngày có chọn được không (biên min/max theo YYYY-MM-DD). */
function isIsoSelectable(iso, minIso, maxIso) {
  if (minIso && cmpIso(iso, minIso) < 0) return false
  if (maxIso && cmpIso(iso, maxIso) > 0) return false
  return true
}

/** 6 hàng × 7 cột, ô đầu là Chủ nhật của tuần chứa ngày 1. */
function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const lead = first.getDay()
  const start = new Date(year, monthIndex, 1 - lead)
  const cells = []
  const cur = new Date(start)
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}

/**
 * Bộ chọn khoảng ngày bình luận (theme tối, kiểu TikTok Studio).
 * `from` / `to`: chuỗi `YYYY-MM-DD` hoặc `''`.
 * `minDate` / `maxDate`: biên (YYYY-MM-DD), không truyền `maxDate` thì mặc định là hôm nay (theo giờ máy).
 */
export function StudioCommentDateRangePicker({ from, to, onApply, minDate = null, maxDate = null }) {
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
  }))
  const [draftStart, setDraftStart] = useState(from || '')
  const [draftEnd, setDraftEnd] = useState(to || '')

  const openPicker = useCallback(() => {
    const todayIso = dateToIso(new Date())
    const maxI = maxDate ?? todayIso
    let minI = minDate
    if (minI && cmpIso(minI, maxI) > 0) minI = maxI

    let df = from || ''
    let dt = to || ''
    if (minI || maxI) {
      if (df) df = clampIso(df, minI, maxI)
      if (dt) dt = clampIso(dt, minI, maxI)
      if (df && dt && cmpIso(df, dt) > 0) {
        const z = df
        df = dt
        dt = z
      }
    }
    setDraftStart(df)
    setDraftEnd(dt)
    const anchorDate = parseIsoLocal(df) || parseIsoLocal(dt) || new Date()
    let anchorIso = dateToIso(anchorDate)
    if (minI && cmpIso(anchorIso, minI) < 0) anchorIso = minI
    if (cmpIso(anchorIso, maxI) > 0) anchorIso = maxI
    const ad = parseIsoLocal(anchorIso)
    if (ad) setView({ y: ad.getFullYear(), m: ad.getMonth() })
    setOpen(true)
  }, [from, to, minDate, maxDate])

  const closePicker = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const grid = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m])

  const monthTitle = useMemo(() => {
    return new Date(view.y, view.m, 1).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    })
  }, [view.y, view.m])

  const goPrevMonth = useCallback(() => {
    setView((v) => (v.m <= 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  }, [])

  const goNextMonth = useCallback(() => {
    setView((v) => (v.m >= 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
  }, [])

  const onPickDay = useCallback(
    (iso) => {
      const todayIso = dateToIso(new Date())
      const maxI = maxDate ?? todayIso
      let minI = minDate
      if (minI && cmpIso(minI, maxI) > 0) minI = maxI
      if (!isIsoSelectable(iso, minI, maxI)) return

      const d = parseIsoLocal(iso)
      if (d && (d.getMonth() !== view.m || d.getFullYear() !== view.y)) {
        setView({ y: d.getFullYear(), m: d.getMonth() })
      }
      if (!draftStart || (draftStart && draftEnd)) {
        setDraftStart(iso)
        setDraftEnd('')
        return
      }
      if (cmpIso(iso, draftStart) < 0) {
        setDraftEnd(draftStart)
        setDraftStart(iso)
      } else {
        setDraftEnd(iso)
      }
    },
    [draftStart, draftEnd, view.m, view.y, minDate, maxDate],
  )

  const handleReset = useCallback(() => {
    setDraftStart('')
    setDraftEnd('')
    closePicker()
    onApply({ from: '', to: '' })
  }, [onApply, closePicker])

  const handleApply = useCallback(() => {
    const todayIso = dateToIso(new Date())
    const maxI = maxDate ?? todayIso
    let minI = minDate
    if (minI && cmpIso(minI, maxI) > 0) minI = maxI

    let f = draftStart || ''
    let t = draftEnd || ''
    if (f && !t) t = f
    if (!f && t) f = t
    if (minI || maxI) {
      if (f) f = clampIso(f, minI, maxI)
      if (t) t = clampIso(t, minI, maxI)
      if (f && t && cmpIso(f, t) > 0) {
        const z = f
        f = t
        t = z
      }
    }
    onApply({ from: f, to: t })
    setOpen(false)
  }, [draftStart, draftEnd, onApply, minDate, maxDate])

  const triggerLabel = useMemo(() => {
    if (!from && !to) return 'Chọn ngày'
    if (from && to) return `${formatDisplay(from)} – ${formatDisplay(to)}`
    if (from) return `${formatDisplay(from)} – …`
    return `… – ${formatDisplay(to)}`
  }, [from, to])

  return (
    <div ref={wrapRef} className="relative inline-flex min-w-0">
      <button
        type="button"
        onClick={() => (open ? closePicker() : openPicker())}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${open ? 'border-pink-500/60 ring-1 ring-pink-500/25' : ''} inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-950 py-1 pr-2.5 pl-2 text-left text-[11px] font-medium text-zinc-200 outline-none transition hover:border-zinc-500`}
      >
        <IoCalendarOutline className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
        <span className="min-w-0 truncate">
          <span className="text-zinc-500">Ngày BL</span>{' '}
          <span className="text-zinc-200">{triggerLabel}</span>
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[200] w-[min(calc(100vw-1.25rem),15rem)] rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl sm:left-0 sm:right-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn khoảng ngày bình luận"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between gap-1 px-0.5">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Tháng trước"
            >
              <IoChevronBack className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold capitalize leading-tight text-zinc-100">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Tháng sau"
            >
              <IoChevronForward className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-[9px] font-semibold leading-none text-zinc-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-px grid grid-cols-7 gap-y-px">
            {grid.map((d) => {
              const iso = dateToIso(d)
              const todayIso = dateToIso(new Date())
              const maxI = maxDate ?? todayIso
              let minI = minDate
              if (minI && cmpIso(minI, maxI) > 0) minI = maxI
              const selectable = isIsoSelectable(iso, minI, maxI)

              const inMonth = d.getMonth() === view.m
              const isStart = Boolean(selectable && draftStart && iso === draftStart)
              const isEnd = Boolean(selectable && draftEnd && iso === draftEnd)
              const inRange =
                selectable &&
                draftStart &&
                draftEnd &&
                cmpIso(draftStart, iso) <= 0 &&
                cmpIso(iso, draftEnd) <= 0
              const midRange = inRange && !isStart && !isEnd

              let cellClass =
                'relative flex h-7 w-full items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition '
              if (!selectable) {
                cellClass += 'cursor-not-allowed opacity-30 hover:bg-transparent '
              } else {
                cellClass += 'cursor-pointer hover:bg-zinc-800 '
              }
              if (!inMonth) cellClass += 'text-zinc-600 '
              else cellClass += 'text-zinc-200 '

              if (midRange) {
                cellClass += 'bg-[#fe2c55]/18 text-zinc-100 hover:bg-[#fe2c55]/25'
              }
              if (isStart || isEnd) {
                cellClass += 'text-white hover:bg-transparent'
              }

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onPickDay(iso)}
                  className={cellClass}
                >
                  {isStart || isEnd ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fe2c55] text-[11px] font-semibold text-white shadow-sm">
                      {d.getDate()}
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center">{d.getDate()}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex shrink-0 gap-1.5 border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleApply()
              }}
              className="min-h-0 flex-1 rounded-lg bg-[#fe2c55] py-1.5 text-[11px] font-bold text-white transition hover:bg-[#e62a4d]"
            >
              Đồng ý
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
              className="min-h-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-950 py-1.5 text-[11px] font-semibold text-zinc-100 transition hover:bg-zinc-800"
            >
              Đặt lại
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
