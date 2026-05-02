import React from "react";

const tipClasses =
  "pointer-events-none absolute left-1/2 top-full z-[60] mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-100 opacity-0 shadow-xl ring-1 ring-zinc-600 transition-opacity duration-150";

const iconBtnSizeClasses = {
  md: "h-8 w-8",
  sm: "h-7 w-7",
};

/** Nút tròn icon + tooltip dưới — Vibely style */
export function TooltipIconButton({
  tip,
  ariaLabel,
  children,
  className = "",
  size = "md",
  ...rest
}) {
  const dim = iconBtnSizeClasses[size] ?? iconBtnSizeClasses.md;
  return (
    <div className={`group/iconbtn relative flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel ?? tip}
        className={`flex cursor-pointer items-center justify-center rounded-full text-zinc-100 transition-colors hover:bg-zinc-700/90 ${dim}`}
        {...rest}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`${tipClasses} group-hover/iconbtn:opacity-100 group-focus-visible/iconbtn:opacity-100`}
      >
        {tip}
      </span>
    </div>
  );
}

/** Bọc Link/button tuỳ ý để hiện tooltip khi hover */
export function TooltipHoverWrap({ tip, className = "", children }) {
  return (
    <div className={`group/hovertip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`${tipClasses} group-hover/hovertip:opacity-100 group-focus-within/hovertip:opacity-100`}
      >
        {tip}
      </span>
    </div>
  );
}
