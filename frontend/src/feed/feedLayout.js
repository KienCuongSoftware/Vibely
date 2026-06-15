/** Nút overlay trên video (⋯, âm lượng) — xám mờ kiểu TikTok, hover không đỏ. */
export const FEED_VIDEO_OVERLAY_BTN_CLASS =
  "rounded-full bg-black/30 p-2.5 text-xl text-white backdrop-blur-md transition-colors hover:bg-white/20 active:bg-white/25";

/** Nút tròn cột tương tác (thích / bình luận / …). */
export const FEED_ROUND_ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/30 text-xl text-white shadow-[0_2px_12px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35";

/** Icon tương tác + số đếm xếp dọc, căn giữa (mobile rail). */
export const FEED_ACTION_ITEM_CLASS =
  "flex min-w-10 flex-col items-center gap-0.5";

/** Panel menu ⋯ — nền đen/xám đậm kiểu TikTok web. */
export const FEED_MORE_PANEL_SURFACE_CLASS =
  "overflow-hidden rounded-xl border border-white/10 bg-[rgba(37,37,37,0.97)] py-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl";

export const FEED_MORE_PANEL_CARET_CLASS =
  "border-l border-t border-white/10 bg-[rgba(37,37,37,0.97)]";

/** Hàng menu trong panel ⋯ — chữ nhỏ (~13px) như TikTok. */
export const FEED_MORE_MENU_ROW_CLASS =
  "flex w-full items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5 text-left text-[13px] leading-tight text-white transition-colors hover:bg-white/[0.06] active:bg-white/10";

export const FEED_MORE_MENU_BADGE_ICON_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-[9px] font-semibold tracking-wide text-white/90";

export const FEED_MORE_MENU_INLINE_ICON_CLASS =
  "h-[18px] w-[18px] shrink-0 text-white/95";

export const FEED_MORE_MENU_CHEVRON_CLASS = "h-4 w-4 shrink-0 text-white/40";

export const FEED_MORE_MENU_VALUE_CLASS = "shrink-0 text-[13px] text-white/50";

/** Chiều ngang sidebar (đồng bộ Sidebar.jsx). */
export const FEED_SIDEBAR_WIDTH_PX = 220;

/** Khoảng cách giữa sidebar / panel và khung video. */
export const FEED_STAGE_EDGE_GAP_PX = 8;

/** Cột icon tương tác (avatar + thích / bình luận / …). */
export const FEED_ACTION_COLUMN_PX = 56;

/** Hai nút mũi tên chuyển video — đặt cạnh cột tương tác, không float. */
export const FEED_CHEVRON_COLUMN_PX = 52;

/** Lề phải ngoài cùng — tránh chật giữa cột nút và mũi tên. */
export const FEED_RIGHT_OUTER_GAP_PX = 28;

/** Tổng chiều ngang bên phải video (cột tương tác + mũi tên + khoảng cách). */
export const FEED_ACTION_RAIL_PX =
  FEED_ACTION_COLUMN_PX +
  FEED_CHEVRON_COLUMN_PX +
  FEED_STAGE_EDGE_GAP_PX * 2 +
  FEED_RIGHT_OUTER_GAP_PX;

/** Panel bình luận dock bên phải — rộng hơn, gần TikTok web (~420px). */
export const FEED_COMMENTS_PANEL_MIN_PX = 380;
export const FEED_COMMENTS_PANEL_WIDTH_PX = 420;

/** CSS width cho panel bình luận (responsive nhưng không hẹp quá 300px). */
export function feedCommentsPanelWidthCss() {
  return `clamp(${FEED_COMMENTS_PANEL_MIN_PX}px, 34vw, ${FEED_COMMENTS_PANEL_WIDTH_PX}px)`;
}

/** Chiều cao slot feed (px dưới viewport). */
export const FEED_VIEWPORT_INSET_PX = 24;

/** Tính chiều rộng khung video ngang — tận dụng tối đa chỗ trống như TikTok web. */
export function computeFeedLandscapeStageWidthPx({
  commentsOpen,
  viewportWidth,
  slotHeightPx,
}) {
  const vw =
    viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1280);
  const slotH =
    slotHeightPx ??
    (typeof window !== "undefined"
      ? Math.max(320, window.innerHeight - FEED_VIEWPORT_INSET_PX)
      : 760);
  const reserved =
    FEED_SIDEBAR_WIDTH_PX +
    FEED_ACTION_RAIL_PX +
    FEED_STAGE_EDGE_GAP_PX +
    (commentsOpen ? FEED_COMMENTS_PANEL_WIDTH_PX + FEED_STAGE_EDGE_GAP_PX : 0);
  const byViewport = Math.max(280, vw - reserved);
  const byAspect = Math.round((slotH * 16) / 9);
  return Math.min(byViewport, byAspect);
}
