import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IoCalendarOutline,
  IoChevronBack,
  IoChevronForward,
  IoTimeOutline,
} from "react-icons/io5";

export const SCHEDULE_MIN_LEAD_MINUTES = 15;
export const SCHEDULE_MINUTE_STEP = 5;

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Next valid schedule slot (>= now + lead), snapped to 5-minute grid. */
export function defaultScheduleDate() {
  const min = addMinutes(new Date(), SCHEDULE_MIN_LEAD_MINUTES);
  const snapped = new Date(min);
  const m = snapped.getMinutes();
  const rem = m % SCHEDULE_MINUTE_STEP;
  if (rem !== 0) {
    snapped.setMinutes(m + (SCHEDULE_MINUTE_STEP - rem), 0, 0);
  } else {
    snapped.setSeconds(0, 0);
  }
  return snapped;
}

export function formatScheduleTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--:--";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatScheduleDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "----/--/--";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function isScheduleAtLeastLeadAhead(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  return date.getTime() >= addMinutes(now, SCHEDULE_MIN_LEAD_MINUTES).getTime();
}

function combineLocal(datePart, hour, minute) {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

function monthMatrix(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  // Monday-first: JS getDay Sun=0 → shift
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * TikTok-style dark schedule pickers (time + date).
 * @param {{ value: Date, onChange: (d: Date) => void, error?: string }} props
 */
export function SchedulePickers({ value, onChange, error }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(null); // 'time' | 'date' | null
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value instanceof Date ? value : defaultScheduleDate();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const selected = value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : defaultScheduleDate();

  const now = useMemo(() => new Date(), [open, selected?.getTime()]);
  const todayStart = startOfLocalDay(now);
  const minAllowed = addMinutes(now, SCHEDULE_MIN_LEAD_MINUTES);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () =>
      Array.from(
        { length: 60 / SCHEDULE_MINUTE_STEP },
        (_, i) => i * SCHEDULE_MINUTE_STEP,
      ),
    [],
  );

  const isHourDisabled = useCallback(
    (hour) => {
      const endOfHour = combineLocal(selected, hour, 59);
      return endOfHour.getTime() < minAllowed.getTime();
    },
    [selected, minAllowed],
  );

  const isMinuteDisabled = useCallback(
    (hour, minute) => {
      const slot = combineLocal(selected, hour, minute);
      return slot.getTime() < minAllowed.getTime();
    },
    [selected, minAllowed],
  );

  const isDayDisabled = useCallback(
    (day) => {
      if (!day) return true;
      if (startOfLocalDay(day).getTime() < todayStart.getTime()) return true;
      // Entire day ends before minAllowed
      const endOfDay = combineLocal(day, 23, 55);
      return endOfDay.getTime() < minAllowed.getTime();
    },
    [todayStart, minAllowed],
  );

  const pickTime = (hour, minute) => {
    if (isMinuteDisabled(hour, minute)) return;
    const next = combineLocal(selected, hour, minute);
    onChange(next);
    setOpen(null);
  };

  const pickDay = (day) => {
    if (isDayDisabled(day)) return;
    let next = combineLocal(day, selected.getHours(), selected.getMinutes());
    if (next.getTime() < minAllowed.getTime()) {
      // Snap to earliest valid slot that day
      next = defaultScheduleDate();
      if (startOfLocalDay(next).getTime() !== startOfLocalDay(day).getTime()) {
        // minAllowed is still today but user picked a future day — use noon or first step
        next = combineLocal(day, 0, 0);
        while (
          next.getTime() < minAllowed.getTime() &&
          next.getDate() === day.getDate()
        ) {
          next = addMinutes(next, SCHEDULE_MINUTE_STEP);
        }
      } else {
        next = combineLocal(
          day,
          defaultScheduleDate().getHours(),
          defaultScheduleDate().getMinutes(),
        );
      }
    }
    onChange(next);
    setOpen(null);
  };

  const cells = monthMatrix(viewMonth.getFullYear(), viewMonth.getMonth());
  const canPrevMonth =
    new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getTime() >
    new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).getTime();

  return (
    <div ref={rootRef} className="relative mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => (o === "time" ? null : "time"))}
          className={`inline-flex min-w-[7.5rem] cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
            open === "time"
              ? "border-[#20d5ec]/60 bg-zinc-800 text-white"
              : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
          }`}
          aria-expanded={open === "time"}
          aria-haspopup="listbox"
        >
          <IoTimeOutline className="text-base text-zinc-400" aria-hidden />
          {formatScheduleTime(selected)}
          <span className="ml-auto text-[10px] text-zinc-500" aria-hidden>
            ▼
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMonth(
              new Date(selected.getFullYear(), selected.getMonth(), 1),
            );
            setOpen((o) => (o === "date" ? null : "date"));
          }}
          className={`inline-flex min-w-[9.5rem] cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
            open === "date"
              ? "border-[#20d5ec]/60 bg-zinc-800 text-white"
              : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
          }`}
          aria-expanded={open === "date"}
          aria-haspopup="dialog"
        >
          <IoCalendarOutline className="text-base text-zinc-400" aria-hidden />
          {formatScheduleDate(selected)}
          <span className="ml-auto text-[10px] text-zinc-500" aria-hidden>
            ▼
          </span>
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#fe2c55]">{error}</p>
      ) : null}

      {open === "time" ? (
        <div className="absolute left-0 z-30 mt-1 flex h-52 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <ul
            className="h-full w-16 overflow-y-auto overscroll-contain py-1 scrollbar-none"
            role="listbox"
            aria-label="Giờ"
          >
            {hours.map((h) => {
              const disabled = isHourDisabled(h);
              const active = selected.getHours() === h;
              return (
                <li key={h}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const m = selected.getMinutes();
                      const snapped =
                        Math.round(m / SCHEDULE_MINUTE_STEP) *
                        SCHEDULE_MINUTE_STEP;
                      const minute = Math.min(55, snapped);
                      if (!isMinuteDisabled(h, minute)) pickTime(h, minute);
                      else {
                        const first = minutes.find(
                          (mm) => !isMinuteDisabled(h, mm),
                        );
                        if (first != null) pickTime(h, first);
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center justify-center px-2 py-1.5 text-sm tabular-nums ${
                      disabled
                        ? "cursor-not-allowed text-zinc-600"
                        : active
                          ? "bg-[#fe2c55]/20 font-semibold text-[#fe2c55]"
                          : "text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {pad2(h)}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="w-px self-stretch bg-zinc-800" aria-hidden />
          <ul
            className="h-full w-16 overflow-y-auto overscroll-contain py-1 scrollbar-none"
            role="listbox"
            aria-label="Phút"
          >
            {minutes.map((m) => {
              const hour = selected.getHours();
              const disabled = isMinuteDisabled(hour, m);
              const active = selected.getMinutes() === m;
              return (
                <li key={m}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => pickTime(hour, m)}
                    className={`flex w-full cursor-pointer items-center justify-center px-2 py-1.5 text-sm tabular-nums ${
                      disabled
                        ? "cursor-not-allowed text-zinc-600"
                        : active
                          ? "bg-[#fe2c55]/20 font-semibold text-[#fe2c55]"
                          : "text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {pad2(m)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {open === "date" ? (
        <div className="absolute left-0 z-30 mt-1 w-[280px] rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl sm:left-auto">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrevMonth}
              onClick={() =>
                setViewMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                )
              }
              className={`rounded-md p-1.5 ${
                canPrevMonth
                  ? "cursor-pointer text-zinc-300 hover:bg-zinc-800"
                  : "cursor-not-allowed text-zinc-700"
              }`}
              aria-label="Tháng trước"
            >
              <IoChevronBack aria-hidden />
            </button>
            <p className="text-sm font-semibold text-zinc-100">
              {viewMonth.toLocaleString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                )
              }
              className="cursor-pointer rounded-md p-1.5 text-zinc-300 hover:bg-zinc-800"
              aria-label="Tháng sau"
            >
              <IoChevronForward aria-hidden />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-zinc-500">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (!day) {
                return <span key={`e-${idx}`} className="h-9" />;
              }
              const disabled = isDayDisabled(day);
              const isSelected =
                day.getFullYear() === selected.getFullYear() &&
                day.getMonth() === selected.getMonth() &&
                day.getDate() === selected.getDate();
              const isToday =
                day.getFullYear() === todayStart.getFullYear() &&
                day.getMonth() === todayStart.getMonth() &&
                day.getDate() === todayStart.getDate();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(day)}
                  className={`flex h-9 cursor-pointer items-center justify-center rounded-full text-sm tabular-nums transition ${
                    disabled
                      ? "cursor-not-allowed text-zinc-600"
                      : isSelected
                        ? "bg-[#fe2c55] font-semibold text-white"
                        : isToday
                          ? "ring-1 ring-[#fe2c55]/70 text-zinc-100 hover:bg-zinc-800"
                          : "text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
