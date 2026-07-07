import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoCheckmark, IoChevronDown } from "react-icons/io5";
import {
  buildBirthDayOptions,
  buildBirthMonthOptions,
  buildBirthYearOptions,
} from "../../utils/birthDate.js";

const LIST_GAP_PX = 4;
const VISIBLE_ROWS = 7;
/** py-2.5 + text 13px mỗi dòng */
const ROW_HEIGHT_PX = 41;
const LIST_CHROME_PX = 8;
const LIST_HEIGHT_PX = VISIBLE_ROWS * ROW_HEIGHT_PX + LIST_CHROME_PX;

export function BirthDateSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  open: openControlled,
  onOpenChange,
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const rootRef = useRef(null);
  const listId = useId();
  const [listPosition, setListPosition] = useState(null);

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

  const setOpenState = (next) => {
    if (openControlled === undefined) {
      setOpenInternal(next);
    }
    onOpenChange?.(next);
  };

  const updateListPosition = () => {
    const trigger = rootRef.current?.querySelector("button");
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();

    setListPosition({
      top: triggerRect.bottom + LIST_GAP_PX,
      left: triggerRect.left,
      width: triggerRect.width,
      maxHeight: LIST_HEIGHT_PX,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setListPosition(null);
      return undefined;
    }
    updateListPosition();

    const onLayoutChange = () => updateListPosition();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const listNode = document.getElementById(listId);
      if (
        rootRef.current?.contains(event.target) ||
        listNode?.contains(event.target)
      ) {
        return;
      }
      setOpenState(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenState(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, listId]);

  const listPanel =
    open && listPosition ? (
      <ul
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: listPosition.top,
          left: listPosition.left,
          width: listPosition.width,
          maxHeight: listPosition.maxHeight,
        }}
        className="birth-date-select-list z-[200] overflow-y-auto rounded-lg bg-zinc-800 py-1 shadow-xl ring-1 ring-zinc-700/80"
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <li key={option.value} role="option" aria-selected={isSelected}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] transition ${
                  isSelected
                    ? "bg-zinc-700/80 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-700/50"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpenState(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <IoCheckmark className="shrink-0 text-base text-zinc-100" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => setOpenState(!open)}
        className={`flex h-10 w-full items-center rounded px-3 pr-8 text-left text-[13px] outline-none ring-0 transition focus:outline-none focus:ring-0 ${
          open ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700/60"
        } ${!selected ? "text-zinc-400" : ""}`}
      >
        <span className="truncate">{displayLabel}</span>
      </button>
      <IoChevronDown
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden
      />
      {listPanel ? createPortal(listPanel, document.body) : null}
    </div>
  );
}

export function BirthDateFields({
  birthMonth,
  birthDay,
  birthYear,
  onMonthChange,
  onDayChange,
  onYearChange,
  monthOptions,
}) {
  const [openField, setOpenField] = useState(null);

  const yearSelectOptions = useMemo(
    () =>
      buildBirthYearOptions().map((year) => ({
        value: year,
        label: year,
      })),
    [],
  );

  const monthSelectOptions = useMemo(() => {
    const values = buildBirthMonthOptions();
    return values.map((value) => ({
      value,
      label: monthOptions[Number(value) - 1] ?? value,
    }));
  }, [monthOptions]);

  const daySelectOptions = useMemo(() => {
    return buildBirthDayOptions(birthYear, birthMonth).map((day) => ({
      value: day,
      label: day,
    }));
  }, [birthMonth, birthYear]);

  return (
    <div className="grid grid-cols-3 gap-2">
      <BirthDateSelect
        value={birthMonth}
        onChange={onMonthChange}
        options={monthSelectOptions}
        placeholder="Tháng"
        ariaLabel="Chọn tháng sinh"
        open={openField === "month"}
        onOpenChange={(isOpen) => setOpenField(isOpen ? "month" : null)}
      />
      <BirthDateSelect
        value={birthDay}
        onChange={onDayChange}
        options={daySelectOptions}
        placeholder="Ngày"
        ariaLabel="Chọn ngày sinh"
        open={openField === "day"}
        onOpenChange={(isOpen) => setOpenField(isOpen ? "day" : null)}
      />
      <BirthDateSelect
        value={birthYear}
        onChange={onYearChange}
        options={yearSelectOptions}
        placeholder="Năm"
        ariaLabel="Chọn năm sinh"
        open={openField === "year"}
        onOpenChange={(isOpen) => setOpenField(isOpen ? "year" : null)}
      />
    </div>
  );
}
