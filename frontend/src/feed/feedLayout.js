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

/** Panel bình luận dock bên phải. */
export const FEED_COMMENTS_PANEL_WIDTH_PX = 300;

/** Chiều cao slot feed (px dưới viewport). */
export const FEED_VIEWPORT_INSET_PX = 24;

/** Tính chiều rộng khung video ngang — tận dụng tối đa chỗ trống như TikTok web. */
export function computeFeedLandscapeStageWidthPx({
  commentsOpen,
  viewportWidth,
  slotHeightPx,
}) {
  const vw =
    viewportWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 1280);
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
