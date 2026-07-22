/** Nút overlay trên video (⋯, âm lượng) — xám mờ kiểu TikTok, hover không đỏ. */
export const FEED_VIDEO_OVERLAY_BTN_CLASS =
  "rounded-full bg-black/30 p-2.5 text-xl text-white backdrop-blur-md transition-colors hover:bg-white/20 active:bg-white/25";

/** Nút tròn cột tương tác (thích / bình luận / …). */
export const FEED_ROUND_ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/30 text-xl text-white shadow-[0_2px_12px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35";

/** Icon tương tác + số đếm xếp dọc, căn giữa (mobile rail). */
export const FEED_ACTION_ITEM_CLASS =
  "flex min-w-10 flex-col items-center gap-0.5";

/** Panel menu ⋯ — nền xám đậm đặc kiểu TikTok web. */
export const FEED_MORE_PANEL_SURFACE_CLASS =
  "overflow-hidden rounded-xl bg-[#2f2f2f] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]";

export const FEED_MORE_PANEL_CARET_CLASS = "bg-[#2f2f2f]";

/** Hàng menu trong panel ⋯ — TikTok: không kẻ từng dòng, chữ ~14px. */
export const FEED_MORE_MENU_ROW_CLASS =
  "flex w-full items-center gap-3 px-3.5 py-3 text-left text-[14px] leading-tight text-white transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]";

export const FEED_MORE_MENU_BADGE_ICON_CLASS =
  "flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold tracking-wide text-white/90";

export const FEED_MORE_MENU_INLINE_ICON_CLASS =
  "h-[18px] w-[18px] shrink-0 text-white/95";

export const FEED_MORE_MENU_CHEVRON_CLASS = "h-4 w-4 shrink-0 text-white/45";

export const FEED_MORE_MENU_VALUE_CLASS = "shrink-0 text-[14px] text-white/55";

/** Pill tốc độ trong khung bao (TikTok segmented control). */
export const FEED_MORE_SPEED_TRACK_CLASS =
  "ml-auto flex shrink-0 items-center gap-0.5 rounded-full bg-black/50 p-0.5";

export const FEED_MORE_SPEED_PILL_CLASS =
  "min-w-[2.15rem] rounded-full px-1.5 py-1 text-center text-[12px] font-semibold tabular-nums transition-colors";

export const FEED_MORE_SPEED_PILL_ACTIVE_CLASS =
  "bg-[#3a3a3a] text-white shadow-sm";

export const FEED_MORE_SPEED_PILL_IDLE_CLASS =
  "text-white/75 hover:text-white";

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
