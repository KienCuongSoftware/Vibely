import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const tipBaseClasses =
  "pointer-events-none z-[60] whitespace-nowrap rounded-xl border-0 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 shadow-[0_4px_16px_rgba(0,0,0,0.18)]";

const tipPlacementClasses = {
  bottom: "top-full mt-2",
  top: "bottom-full mb-2",
};

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
        className={`flex cursor-pointer items-center justify-center rounded-full text-zinc-100 transition-colors hover:bg-zinc-800 ${dim}`}
        {...rest}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`absolute left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-150 ${tipBaseClasses} ${tipPlacementClasses.bottom} group-hover/iconbtn:opacity-100 group-focus-visible/iconbtn:opacity-100`}
      >
        {tip}
      </span>
    </div>
  );
}

/** Bọc Link/button tuỳ ý để hiện tooltip khi hover */
export function TooltipHoverWrap({
  tip,
  className = "",
  tipHidden = false,
  /** "top" | "bottom" — mặc định hiện dưới icon. */
  placement = "bottom",
  /** true: chỉ hover — không dùng focus-within (tránh click avatar vẫn dính tooltip). */
  hoverOnly = false,
  /** Render tooltip in a portal so overflow:hidden parents cannot clip it. */
  portal = false,
  children,
}) {
  const wrapRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const showTipClasses = hoverOnly
    ? "group-hover/hovertip:opacity-100"
    : "group-hover/hovertip:opacity-100 group-focus-within/hovertip:opacity-100";
  const tipPlacement = tipPlacementClasses[placement] ?? tipPlacementClasses.bottom;

  const updateCoords = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  useLayoutEffect(() => {
    if (!portal || tipHidden || !visible) return undefined;
    updateCoords();
    const onReposition = () => updateCoords();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [portal, tipHidden, visible, placement, tip]);

  const show = () => {
    if (portal) {
      updateCoords();
      setVisible(true);
    }
  };
  const hide = () => {
    if (portal) setVisible(false);
  };

  const tipNode = tipHidden ? null : portal ? (
    visible
      ? createPortal(
          <span
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={`fixed -translate-x-1/2 ${
              placement === "top" ? "-translate-y-full" : ""
            } ${tipBaseClasses}`}
          >
            {tip}
          </span>,
          document.body,
        )
      : null
  ) : (
    <span
      role="tooltip"
      className={`absolute left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-150 ${tipBaseClasses} ${tipPlacement} ${showTipClasses}`}
    >
      {tip}
    </span>
  );

  return (
    <div
      ref={wrapRef}
      className={`group/hovertip relative inline-flex ${className}`}
      onMouseEnter={portal ? show : undefined}
      onMouseLeave={portal ? hide : undefined}
      onFocus={portal && !hoverOnly ? show : undefined}
      onBlur={portal && !hoverOnly ? hide : undefined}
    >
      {children}
      {tipNode}
    </div>
  );
}
