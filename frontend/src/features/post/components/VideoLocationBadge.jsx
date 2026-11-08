import React from "react";
import { IoLocationSharp } from "react-icons/io5";

/**
 * TikTok-style location pill: green pin tile + white label on dark glass.
 * @param {{ name?: string|null, className?: string, size?: 'md' | 'sm' }} props
 */
export function VideoLocationBadge({ name, className = "", size = "md" }) {
  const label = String(name ?? "").trim();
  if (!label) return null;
  const compact = size === "sm";
  return (
    <div
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md bg-black/55 backdrop-blur-[2px] ${
        compact ? "gap-1 px-1.5 py-1" : "px-2 py-[5px]"
      } ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-[4px] bg-[#20D56A] ${
          compact ? "h-4 w-4" : "h-[18px] w-[18px]"
        }`}
        aria-hidden
      >
        <IoLocationSharp
          className={`text-white ${compact ? "text-[10px]" : "text-[12px]"}`}
        />
      </span>
      <span
        className={`min-w-0 truncate font-semibold leading-none text-white ${
          compact ? "text-[11px]" : "text-[13px]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
