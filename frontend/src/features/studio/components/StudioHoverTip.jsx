import React from "react";

/**
 * Tooltip tối kiểu TikTok — hiện khi hover vào chữ (có mũi tên xuống).
 * @param {{
 *   text: string,
 *   children: React.ReactNode,
 *   className?: string,
 *   underline?: boolean,
 *   placement?: 'top' | 'bottom',
 * }} props
 */
export function StudioHoverTip({
  text,
  children,
  className = "",
  underline = true,
  placement = "top",
}) {
  if (!text) return children;
  const below = placement === "bottom";
  return (
    <span className={`group/tip relative inline-flex max-w-full ${className}`}>
      <span
        className={
          underline
            ? "cursor-help border-b border-dotted border-transparent transition group-hover/tip:border-zinc-500"
            : "cursor-help"
        }
      >
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-zinc-800 px-2.5 py-2 text-left text-[11px] leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover/tip:opacity-100 ${
          below ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"
        }`}
      >
        {text}
        <span
          aria-hidden
          className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${
            below ? "bottom-full border-b-zinc-800" : "top-full border-t-zinc-800"
          }`}
        />
      </span>
    </span>
  );
}
