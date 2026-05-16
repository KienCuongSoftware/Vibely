import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import {
  FeedPhoneStage,
  FEED_STAGE_OUTER_WIDTH_CLASS,
} from "../components/feed/FeedPhoneStage";
import { useAuth } from "../state/useAuth";
import { Sidebar } from "../components/Sidebar";
import { TooltipHoverWrap } from "../components/TooltipControls";
import { AccountActionsPill } from "../components/AccountActionsPill";
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from "../utils/watchQualifiesForViewRecord";
import {
  IoArrowRedo,
  IoArrowUp,
  IoBookmark,
  IoChevronDown,
  IoChevronUp,
  IoCompass,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoHeart,
  IoHeartOutline,
  IoHome,
  IoLogOutOutline,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoVideocam,
} from "react-icons/io5";
import { FaComment } from "react-icons/fa6";
import { MdOutlineFileUpload } from "react-icons/md";

const DEFAULT_USER_AVATAR_URL = "/images/users/default-avatar.jpeg";

function deriveVibelyIdFromEmail(email) {
  const safeEmail = String(email ?? "").trim();
  if (!safeEmail) return "vibely.user";

  const localPart = safeEmail.split("@")[0] ?? "";
  const withoutDiacritics = localPart
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  let base = withoutDiacritics.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!base) base = "vibelyuser";

  while (base.length < 4) base = `${base}user`;
  if (base.length > 24) base = base.slice(0, 24);
  return base;
}

function decodeJwtSubject(token) {
  try {
    if (!token) return "";
    const parts = String(token).split(".");
    if (parts.length < 2) return "";
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "=",
    );
    const json = atob(padded);
    const data = JSON.parse(json);
    return data?.sub ?? data?.subject ?? "";
  } catch {
    return "";
  }
}

function buildProfilePath(token, user) {
  if (!token) return "/login";
  const username = user?.username
    ? String(user.username).trim().replace(/^@/, "")
    : "";
  const emailFromUser = user?.email;
  const emailFromToken = decodeJwtSubject(token);
  const vibelyId = username
    ? username
    : deriveVibelyIdFromEmail(emailFromUser || emailFromToken);
  return `/@${encodeURIComponent(vibelyId || "vibely.user")}`;
}

function formatCompactCount(value) {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    const formatted =
      count >= 10_000 ? (count / 1_000).toFixed(0) : (count / 1_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}K`;
  }
  return String(count);
}

function resolveFeedAuthorDisplayName(video) {
  const name = String(video?.authorDisplayName ?? "").trim();
  if (name) return name;
  const fallback = String(video?.authorUsername ?? "")
    .trim()
    .replace(/^@/, "");
  return fallback || "Nhà sáng tạo";
}

function isBackendVideoId(id) {
  if (id == null) return false;
  return /^\d+$/.test(String(id));
}

/** Avatar tác giả từ API; không dùng pravatar (tránh lệch với hồ sơ thật). */
const FEED_DEFAULT_AUTHOR_AVATAR = "/images/users/default-avatar.jpeg";

function resolveVideoAuthorAvatar(item) {
  const raw = item?.authorAvatarUrl;
  if (raw != null && String(raw).trim()) return String(raw).trim();
  return FEED_DEFAULT_AUTHOR_AVATAR;
}

function formatRelativeTimeVi(isoOrMs) {
  if (isoOrMs == null) return "";
  const d =
    typeof isoOrMs === "string" || typeof isoOrMs === "number"
      ? new Date(isoOrMs)
      : isoOrMs;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

/** Nút tròn viền xám — đồng bộ mũi tên chuyển video & thích / bình luận / lưu / chia sẻ. */
const FEED_ROUND_ICON_BUTTON =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/90 bg-zinc-900/95 text-xl text-zinc-100 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35";

function normalizeVideoItem(item) {
  return {
    ...item,
    authorDisplayName:
      item.authorDisplayName != null &&
      String(item.authorDisplayName).trim()
        ? String(item.authorDisplayName).trim()
        : undefined,
    avatarUrl: resolveVideoAuthorAvatar(item),
    shareCount: Number(item.shareCount ?? 0),
    bookmarkCount: Number(item.bookmarkCount ?? 0),
  };
}

function mergeVideosById(prev, incoming) {
  const seen = new Set(prev.map((v) => String(v.id)));
  const out = [...prev];
  for (const raw of incoming) {
    const item = normalizeVideoItem(raw);
    const id = String(item.id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

function FeedChevronNav({
  variant,
  activeIndex,
  videoCount,
  setActiveIndex,
  virtualFeedRef,
}) {
  const shell =
    variant === "dock"
      ? "flex shrink-0 flex-col justify-center gap-2.5 bg-zinc-950/60 px-1.5"
      : "absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5";
  return (
    <div className={shell}>
      <button
        type="button"
        aria-label="Video trước"
        className={FEED_ROUND_ICON_BUTTON}
        disabled={activeIndex === 0}
        onClick={() => {
          setActiveIndex((prev) => {
            const n = Math.max(prev - 1, 0);
            queueMicrotask(() => virtualFeedRef?.current?.scrollToIndex(n));
            return n;
          });
        }}
      >
        <IoChevronUp aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Video tiếp theo"
        className={FEED_ROUND_ICON_BUTTON}
        disabled={activeIndex >= videoCount - 1}
        onClick={() => {
          setActiveIndex((prev) => {
            const n = Math.min(prev + 1, videoCount - 1);
            queueMicrotask(() => virtualFeedRef?.current?.scrollToIndex(n));
            return n;
          });
        }}
      >
        <IoChevronDown aria-hidden />
      </button>
    </div>
  );
}

function ForYouFeedPage({ token, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const studioNavRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const loadMoreLockRef = useRef(false);
  const virtualFeedRef = useRef(null);
  const computeFeedSlotHeight = useCallback(() => {
    if (typeof window === "undefined") return 760;
    const w = window.innerWidth;
    const maxH = w >= 1024 ? 920 : 860;
    return Math.min(Math.round(window.innerHeight * 0.88), maxH);
  }, []);
  const [feedSlotHeightPx, setFeedSlotHeightPx] = useState(() =>
    typeof window === "undefined" ? 760 : computeFeedSlotHeight(),
  );
  useEffect(() => {
    setFeedSlotHeightPx(computeFeedSlotHeight());
    const onResize = () => setFeedSlotHeightPx(computeFeedSlotHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFeedSlotHeight]);
  const [activeMenu, setActiveMenu] = useState("latest");
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [shared, setShared] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const accountMenuRef = useRef(null);
  const feedVideoRef = useRef(null);
  const feedProgressTrackRef = useRef(null);
  const feedProgressScrubbingRef = useRef(false);
  const [feedMuted, setFeedMuted] = useState(true);
  const [feedProgressPct, setFeedProgressPct] = useState(0);
  const [feedProgressScrubbing, setFeedProgressScrubbing] = useState(false);
  const [feedMoreMenuOpen, setFeedMoreMenuOpen] = useState(false);
  /** 'main' | 'quality' — màn phụ chọn chất lượng trong menu ⋯ */
  const [feedMoreMenuSubpage, setFeedMoreMenuSubpage] = useState("main");
  /** HLS: 'auto' | '540' | '720' (hls.js); Safari native HLS không đổi rendition qua UI này */
  const [feedVideoQuality, setFeedVideoQuality] = useState("auto");
  const [feedAutoScrollEnabled, setFeedAutoScrollEnabled] = useState(false);
  const [feedPaused, setFeedPaused] = useState(true);
  const [feedCommentsOpen, setFeedCommentsOpen] = useState(false);
  const [feedSidePanelTab, setFeedSidePanelTab] = useState("comments");
  const [commentDraft, setCommentDraft] = useState("");
  const [feedComments, setFeedComments] = useState([]);
  const [feedCommentsLoading, setFeedCommentsLoading] = useState(false);
  const [feedCommentsError, setFeedCommentsError] = useState("");
  const [commentPostError, setCommentPostError] = useState("");
  const feedViewQualifySentRef = useRef(new Set());
  const feedViewPlaythroughSentRef = useRef(new Set());
  const playbackFlashTimerRef = useRef(null);
  /** TikTok-style: brief center icon after tap — 'play' | 'pause' */
  const [playbackFlash, setPlaybackFlash] = useState(null);
  /** false cho đến khi lần fetch feed (theo token/menu/location) chạy xong — tránh flash “feed trống” khi reload. */
  const [feedHydrated, setFeedHydrated] = useState(false);

  const activeVideo = videos[activeIndex] ?? null;

  useEffect(() => {
    const id =
      activeVideo?.id != null && isBackendVideoId(activeVideo.id)
        ? String(activeVideo.id)
        : null;
    return () => {
      if (id != null) {
        feedViewQualifySentRef.current.delete(id);
        feedViewPlaythroughSentRef.current.delete(id);
      }
    };
  }, [activeVideo?.id]);

  useEffect(() => {
    setPlaybackFlash(null);
    if (playbackFlashTimerRef.current != null) {
      clearTimeout(playbackFlashTimerRef.current);
      playbackFlashTimerRef.current = null;
    }
  }, [activeVideo?.id]);

  useEffect(
    () => () => {
      if (playbackFlashTimerRef.current != null) {
        clearTimeout(playbackFlashTimerRef.current);
      }
    },
    [],
  );

  const patchVideoById = useCallback((videoId, patch) => {
    if (videoId == null) return;
    setVideos((prev) =>
      prev.map((v) =>
        String(v.id) === String(videoId) ? { ...v, ...patch } : v,
      ),
    );
  }, []);

  const loadMoreFeed = useCallback(async () => {
    if (activeMenu === "following") return;
    if (!hasMoreFeed || !nextCursor || loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;
    try {
      const response = await apiClient.getFeed({
        size: 8,
        sort: "latest",
        cursor: nextCursor,
      });
      const items = response?.items ?? [];
      const chunk = items.map(normalizeVideoItem);
      setVideos((prev) => mergeVideosById(prev, chunk));
      setHasMoreFeed(Boolean(response?.hasNext));
      setNextCursor(response?.nextCursor ?? null);
    } catch {
      /* ignore */
    } finally {
      loadMoreLockRef.current = false;
    }
  }, [activeMenu, hasMoreFeed, nextCursor]);

  useEffect(() => {
    const raw = location.state?.focusVideoId;
    if (raw == null && location.state?.openComments == null) return;
    const idNum = Number(raw);
    studioNavRef.current = {
      id: Number.isFinite(idNum) ? idNum : null,
      openComments: Boolean(location.state?.openComments),
    };
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let isMounted = true;
    setFeedHydrated(false);
    const params = new URLSearchParams(location.search);
    const rawV = params.get("v");
    let queryFocusId = null;
    let queryOpenComments = false;
    if (rawV != null) {
      const n = Number(rawV);
      if (Number.isFinite(n)) {
        queryFocusId = n;
        queryOpenComments = params.get("comments") === "1";
      }
      const path = location.pathname;
      queueMicrotask(() =>
        navigate({ pathname: path, search: "" }, { replace: true }),
      );
    }

    const pending = studioNavRef.current;
    if (pending != null) {
      studioNavRef.current = null;
    }
    const focusId =
      pending?.id != null && Number.isFinite(pending.id)
        ? pending.id
        : queryFocusId;
    const openComments =
      Boolean(pending?.openComments) || queryOpenComments;

    (async () => {
      try {
        const request =
          token && activeMenu === "following"
            ? apiClient.getFollowingFeed(token, { page: 0, size: 8 })
            : apiClient.getFeed({ size: 8, sort: "latest" });

        try {
          const response = await request;
          const items = response?.items ?? [];
          if (!isMounted) return;

          let normalized = items.map(normalizeVideoItem);

          if (items.length === 0) {
            if (focusId != null) {
              try {
                const one = await apiClient.getVideo(focusId, { token });
                const focusNorm = normalizeVideoItem(one);
                normalized = [focusNorm];
                const idx = 0;
                setActiveIndex(idx);
                if (openComments) setFeedCommentsOpen(true);
                queueMicrotask(() => virtualFeedRef.current?.scrollToIndex(idx));
                setVideos(normalized);
                setNextCursor(null);
                setHasMoreFeed(false);
                return;
              } catch {
                /* fall through */
              }
            }
            if (token && activeMenu === "following") {
              setActiveIndex(0);
              setVideos([]);
              setNextCursor(null);
              setHasMoreFeed(false);
              return;
            }
            if (token) {
              try {
                const mine = await apiClient.getMyUploadedVideos(token, {
                  page: 0,
                  size: 16,
                });
                const mineItems = Array.isArray(mine?.items) ? mine.items : [];
                if (mineItems.length > 0) {
                  normalized = mineItems.map(normalizeVideoItem);
                  setActiveIndex(0);
                  setVideos(normalized);
                  setNextCursor(null);
                  setHasMoreFeed(Boolean(mine?.hasNext));
                  return;
                }
              } catch {
                /* fall through */
              }
              setActiveIndex(0);
              setVideos([]);
              setNextCursor(null);
              setHasMoreFeed(false);
              return;
            }
            setVideos([]);
            setNextCursor(null);
            setHasMoreFeed(false);
            return;
          }

          if (focusId != null) {
            const has = normalized.some((v) => String(v.id) === String(focusId));
            if (!has) {
              try {
                const one = await apiClient.getVideo(focusId, { token });
                const focusNorm = normalizeVideoItem(one);
                normalized = [focusNorm, ...normalized];
              } catch {
                /* không tải được video (đã gỡ / lỗi mạng) */
              }
            }
            const idx = normalized.findIndex((v) => String(v.id) === String(focusId));
            if (idx >= 0) {
              setActiveIndex(idx);
              if (openComments) setFeedCommentsOpen(true);
              queueMicrotask(() => virtualFeedRef.current?.scrollToIndex(idx));
            }
          }

          setVideos(normalized);
          setHasMoreFeed(Boolean(response?.hasNext));
          setNextCursor(
            token && activeMenu === "following"
              ? null
              : response?.nextCursor ?? null,
          );
        } catch {
          if (isMounted) {
            if (token && activeMenu === "following") {
              setVideos([]);
            } else if (token) {
              try {
                const mine = await apiClient.getMyUploadedVideos(token, {
                  page: 0,
                  size: 16,
                });
                const mineItems = Array.isArray(mine?.items) ? mine.items : [];
                if (mineItems.length > 0) {
                  setVideos(mineItems.map(normalizeVideoItem));
                  setHasMoreFeed(Boolean(mine?.hasNext));
                  setNextCursor(null);
                  return;
                }
              } catch {
                /* noop */
              }
              setVideos([]);
            } else {
              setVideos([]);
            }
            setNextCursor(null);
            setHasMoreFeed(false);
          }
        }
      } finally {
        if (isMounted) setFeedHydrated(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token, activeMenu, location.key, navigate, location.pathname]);

  useEffect(() => {
    setActiveIndex((idx) => {
      if (videos.length === 0) return 0;
      return Math.min(Math.max(0, idx), videos.length - 1);
    });
  }, [videos]);

  useEffect(() => {
    if (videos.length === 0) {
      setFeedCommentsOpen(false);
      setFeedMoreMenuOpen(false);
    }
  }, [videos.length]);

  useEffect(() => {
    setLiked(false);
    setBookmarked(false);
    setShared(false);
    setFeedMoreMenuOpen(false);
  }, [activeIndex]);

  useEffect(() => {
    if (!token || !isBackendVideoId(activeVideo?.id)) {
      return;
    }
    let cancelled = false;
    apiClient
      .getVideoMeState(activeVideo.id, token)
      .then((s) => {
        if (!cancelled) {
          setLiked(Boolean(s?.liked));
          setBookmarked(Boolean(s?.bookmarked));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiked(false);
          setBookmarked(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeVideo?.id]);

  useEffect(() => {
    setCommentDraft("");
    setFeedSidePanelTab("comments");
    setFeedComments([]);
    setFeedCommentsError("");
    setCommentPostError("");
  }, [activeIndex]);

  useEffect(() => {
    if (!feedCommentsOpen || !isBackendVideoId(activeVideo?.id)) {
      return undefined;
    }
    let cancelled = false;
    const vid = activeVideo.id;
    setFeedCommentsLoading(true);
    setFeedCommentsError("");
    apiClient
      .getComments(vid, { token })
      .then((list) => {
        if (!cancelled) setFeedComments(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setFeedCommentsError(
            e instanceof Error ? e.message : "Không tải được bình luận.",
          );
          setFeedComments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFeedCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feedCommentsOpen, activeVideo?.id, token]);

  useEffect(() => {
    if (!feedCommentsOpen) setFeedSidePanelTab("comments");
  }, [feedCommentsOpen]);

  useEffect(() => {
    if (!feedCommentsOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setFeedCommentsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedCommentsOpen]);

  useEffect(() => {
    if (!feedMoreMenuOpen) {
      setFeedMoreMenuSubpage("main");
    }
  }, [feedMoreMenuOpen]);

  useEffect(() => {
    if (!feedMoreMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (feedMoreMenuSubpage === "quality") {
        setFeedMoreMenuSubpage("main");
      } else {
        setFeedMoreMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedMoreMenuOpen, feedMoreMenuSubpage]);

  const onActiveFeedPlaybackTick = useCallback((e) => {
    const el = e.currentTarget;
    if (!el || el.tagName !== "VIDEO") return;
    const idAttr = el.getAttribute("data-feed-video-id");
    if (idAttr == null || !String(idAttr).trim()) return;

    let dur = el.duration;
    if (!Number.isFinite(dur) || dur <= 0) {
      try {
        if (el.seekable?.length) {
          dur = el.seekable.end(el.seekable.length - 1);
        }
      } catch {
        /* noop */
      }
    }
    if (Number.isFinite(dur) && dur > 0) {
      setFeedProgressPct(
        Math.min(100, Math.max(0, (el.currentTime / dur) * 100)),
      );
    }

    const id = String(idAttr);
    if (!isBackendVideoId(id)) return;

    const watchedMs = Math.floor(el.currentTime * 1000);
    const durationMs =
      Number.isFinite(dur) && dur > 0 ? Math.floor(dur * 1000) : null;

    if (
      durationMs != null &&
      !feedViewPlaythroughSentRef.current.has(id) &&
      watchTimeNearPlaythroughEnd(watchedMs, durationMs)
    ) {
      feedViewPlaythroughSentRef.current.add(id);
      apiClient
        .recordVideoView(id, {
          watchedMs,
          durationMs,
        })
        .catch(() => {
          feedViewPlaythroughSentRef.current.delete(id);
        });
      return;
    }

    if (feedViewQualifySentRef.current.has(id)) return;
    if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return;
    feedViewQualifySentRef.current.add(id);
    apiClient
      .recordVideoView(id, {
        watchedMs,
        ...(durationMs != null ? { durationMs } : {}),
      })
      .catch(() => {
        feedViewQualifySentRef.current.delete(id);
      });
  }, []);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo?.videoUrl) return;
    setFeedProgressPct(0);
    el.currentTime = 0;
    try {
      const pending = el.play();
      if (pending !== undefined && typeof pending.catch === "function") {
        pending.catch(() => {});
      }
    } catch {
      /* autoplay / jsdom */
    }
  }, [activeIndex, activeVideo?.id, activeVideo?.videoUrl]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo?.videoUrl) return undefined;
    const onPlay = () => setFeedPaused(false);
    const onPause = () => setFeedPaused(true);
    const sync = () => setFeedPaused(el.paused);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("playing", onPlay);
    el.addEventListener("loadeddata", sync);
    sync();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("playing", onPlay);
      el.removeEventListener("loadeddata", sync);
    };
  }, [activeIndex, activeVideo?.id, activeVideo?.videoUrl]);

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowAccountMenu(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!showLogoutConfirm) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLogoutConfirm]);

  const mainMenuItems = [
    {
      id: "latest",
      label: "Đề xuất",
      icon: IoHome,
    },
    {
      id: "explore",
      label: "Khám phá",
      icon: IoCompass,
    },
    {
      id: "following",
      label: "Đã follow",
      icon: IoPeople,
    },
    ...(token
      ? [
          { id: "friends", label: "Bạn bè", icon: IoPeople },
          { id: "messages", label: "Tin nhắn", icon: IoPaperPlane },
          { id: "activity", label: "Hoạt động", icon: IoNotifications },
        ]
      : []),
    {
      id: "live",
      label: "LIVE",
      icon: IoVideocam,
    },
    {
      id: "upload",
      label: "Tải lên",
      icon: MdOutlineFileUpload,
    },
    {
      id: "profile",
      label: "Hồ sơ",
      icon: IoPerson,
    },
    {
      id: "more",
      label: "Thêm",
      icon: IoEllipsisHorizontal,
    },
  ];

  const handleSidebarSelect = (id) => {
    if (id === "profile") {
      navigate(buildProfilePath(token, user));
      return;
    }
    if (id === "upload") {
      navigate("/vibelystudio/upload");
      return;
    }
    setActiveMenu(id);
  };

  const toggleFeedPlayback = useCallback(() => {
    const el = feedVideoRef.current;
    if (!el) return;
    const wasPaused = el.paused;
    if (wasPaused) {
      void el.play().catch(() => {});
      setPlaybackFlash("play");
    } else {
      el.pause();
      setPlaybackFlash("pause");
    }
    if (playbackFlashTimerRef.current != null) {
      clearTimeout(playbackFlashTimerRef.current);
    }
    playbackFlashTimerRef.current = setTimeout(() => {
      setPlaybackFlash(null);
      playbackFlashTimerRef.current = null;
    }, 620);
  }, []);

  const seekFeedVideo = useCallback((clientX, trackEl) => {
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const el = feedVideoRef.current;
    if (!el) return;
    const w = rect.width;
    if (!(w > 0)) return;

    let pct = (clientX - rect.left) / w;
    pct = Math.min(1, Math.max(0, pct));

    if (Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = pct * el.duration;
    } else if (el.seekable?.length) {
      try {
        const end = el.seekable.end(el.seekable.length - 1);
        if (Number.isFinite(end) && end > 0) el.currentTime = pct * end;
      } catch {
        /* noop */
      }
    }

    setFeedProgressPct(pct * 100);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!feedProgressScrubbingRef.current) return;
      const track = feedProgressTrackRef.current;
      if (!track) return;
      if (e.cancelable && e.type === "touchmove") e.preventDefault();
      const cx =
        e.type === "touchmove" ? e.touches[0]?.clientX : e.clientX;
      if (cx == null) return;
      seekFeedVideo(cx, track);
    };
    const onEnd = () => {
      if (!feedProgressScrubbingRef.current) return;
      feedProgressScrubbingRef.current = false;
      setFeedProgressScrubbing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [seekFeedVideo]);

  const toggleFeedPictureInPicture = async () => {
    const el = feedVideoRef.current;
    if (!el || typeof el.requestPictureInPicture !== "function") return;
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture?.();
      } else {
        await el.requestPictureInPicture();
      }
      setFeedMoreMenuOpen(false);
    } catch {
      /* PiP không khả dụng hoặc trình duyệt chặn */
    }
  };

  const suggestedFeedSlots = React.useMemo(
    () =>
      videos
        .map((video, idx) => ({ video, idx }))
        .filter(({ idx }) => idx !== activeIndex),
    [videos, activeIndex],
  );

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 w-full overflow-hidden bg-black text-zinc-100">
      <Sidebar
        menuItems={mainMenuItems}
        activeMenu={activeMenu}
        onSelectMenu={handleSidebarSelect}
        token={token}
        user={user}
        onLogout={token ? onLogout : undefined}
      />

      <div
        className={`relative flex min-h-0 flex-1 overflow-hidden ${
          feedCommentsOpen
            ? "flex-row items-stretch"
            : "items-center justify-center px-6 py-5"
        }`}
      >
        <AccountActionsPill
          className="absolute right-8 top-5 z-[100]"
          tone="profile"
        >
          {!token ? (
            <Link
              to="/login"
              className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs font-semibold leading-none text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản" tipHidden={showAccountMenu} hoverOnly>
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt="avatar người dùng"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR_URL;
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div className="absolute right-0 z-[110] mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
                  <Link
                    to={buildProfilePath(token, user)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </AccountActionsPill>

        <div
          className={`flex min-h-0 flex-1 items-center ${
            feedCommentsOpen ? "min-w-0 justify-end pr-1" : "justify-center"
          }`}
        >
          {!feedHydrated && videos.length === 0 ? (
            <div
              className={`relative flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
              style={{ height: feedSlotHeightPx }}
              aria-busy="true"
              aria-label="Đang tải feed"
            >
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
                aria-hidden
              />
              <p className="mt-4 text-sm text-zinc-500">Đang tải…</p>
            </div>
          ) : videos.length === 0 ? (
            <div
              className={`relative flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
              style={{ height: feedSlotHeightPx }}
              aria-live="polite"
            >
              <IoVideocam
                className="mb-4 h-14 w-14 text-zinc-600"
                aria-hidden
              />
              {!token ? (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    Chưa có video trên feed
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
                    Đăng nhập để xem nội dung và đẩy lên video đầu tiên của bạn
                    trên Vibely.
                  </p>
                  <Link
                    to="/login"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Đăng nhập
                  </Link>
                </>
              ) : activeMenu === "following" ? (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    Chưa có video từ người bạn follow
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
                    Follow thêm creator hoặc mở Đề xuất để xem video công khai.
                  </p>
                  <button
                    type="button"
                    className="mt-6 inline-flex items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
                    onClick={() => setActiveMenu("latest")}
                  >
                    Xem Đề xuất
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-zinc-100">
                    Feed Đề xuất đang trống
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
                    Đẩy lên video đầu tiên của bạn — video sẽ xuất hiện ở đây sau
                    khi xử lý xong (READY). Bạn cũng có thể xem mọi bản upload
                    trong Hồ sơ.
                  </p>
                  <Link
                    to="/vibelystudio/upload"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    <MdOutlineFileUpload className="text-lg" aria-hidden />
                    Tải lên video
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div
              className={`flex max-w-full flex-row justify-center gap-0 ${
                feedCommentsOpen ? "min-w-0 shrink items-center" : "items-end"
              }`}
            >
              <FeedPhoneStage
                videos={videos}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                feedSlotHeightPx={feedSlotHeightPx}
                virtualFeedRef={virtualFeedRef}
                loadMoreFeed={loadMoreFeed}
                feedVideoRef={feedVideoRef}
                feedMuted={feedMuted}
                setFeedMuted={setFeedMuted}
                feedMoreMenuOpen={feedMoreMenuOpen}
                setFeedMoreMenuOpen={setFeedMoreMenuOpen}
                feedMoreMenuSubpage={feedMoreMenuSubpage}
                setFeedMoreMenuSubpage={setFeedMoreMenuSubpage}
                feedVideoQuality={feedVideoQuality}
                setFeedVideoQuality={setFeedVideoQuality}
                feedAutoScrollEnabled={feedAutoScrollEnabled}
                setFeedAutoScrollEnabled={setFeedAutoScrollEnabled}
                feedProgressTrackRef={feedProgressTrackRef}
                feedProgressPct={feedProgressPct}
                setFeedProgressPct={setFeedProgressPct}
                feedProgressScrubbingRef={feedProgressScrubbingRef}
                feedProgressScrubbing={feedProgressScrubbing}
                setFeedProgressScrubbing={setFeedProgressScrubbing}
                seekFeedVideo={seekFeedVideo}
                toggleFeedPlayback={toggleFeedPlayback}
                toggleFeedPictureInPicture={toggleFeedPictureInPicture}
                resolveFeedAuthorDisplayName={resolveFeedAuthorDisplayName}
                feedDefaultAuthorAvatar={FEED_DEFAULT_AUTHOR_AVATAR}
                thumbnailFallbackUrl={undefined}
                playbackFlash={playbackFlash}
                onActiveFeedPlaybackTick={onActiveFeedPlaybackTick}
                commentsDockOpen={feedCommentsOpen}
              />
              <div className="ml-4 flex flex-col items-center gap-3">
                <button
                  type="button"
                  className="relative h-12 w-12 cursor-pointer rounded-full border-2 border-white/90 bg-zinc-700 p-[2px]"
                >
                  <img
                    className="h-full w-full rounded-full object-cover"
                    src={
                      activeVideo?.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR
                    }
                    alt={`avatar-${activeVideo?.authorUsername ?? "user"}`}
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-1 text-[10px] leading-3 text-white">
                    +
                  </span>
                </button>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={liked}
                  aria-label={liked ? "Bỏ thích" : "Thích"}
                  onClick={() => {
                    if (!token || !isBackendVideoId(activeVideo?.id)) {
                      setLiked((prev) => !prev);
                      return;
                    }
                    const next = !liked;
                    const prevCount = Number(activeVideo.likeCount ?? 0);
                    setLiked(next);
                    patchVideoById(activeVideo.id, {
                      likeCount: Math.max(0, prevCount + (next ? 1 : -1)),
                    });
                    const req = next
                      ? apiClient.likeVideo(activeVideo.id, token)
                      : apiClient.unlikeVideo(activeVideo.id, token);
                    req.catch(() => {
                      setLiked(!next);
                      patchVideoById(activeVideo.id, { likeCount: prevCount });
                    });
                  }}
                >
                  <IoHeart
                    className={liked ? "text-red-500" : "text-zinc-100"}
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.likeCount)}
                </span>
                <button
                  type="button"
                  className={`${FEED_ROUND_ICON_BUTTON} ${feedCommentsOpen ? "ring-2 ring-white/35 ring-offset-2 ring-offset-black" : ""}`}
                  aria-label="Bình luận"
                  aria-expanded={feedCommentsOpen}
                  onClick={() => setFeedCommentsOpen((open) => !open)}
                >
                  <FaComment className="text-lg text-zinc-100" aria-hidden />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.commentCount)}
                </span>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}
                  onClick={() => {
                    if (!token || !isBackendVideoId(activeVideo?.id)) {
                      setBookmarked((prev) => !prev);
                      return;
                    }
                    const next = !bookmarked;
                    const prevBm = Number(activeVideo.bookmarkCount ?? 0);
                    setBookmarked(next);
                    patchVideoById(activeVideo.id, {
                      bookmarkCount: Math.max(0, prevBm + (next ? 1 : -1)),
                    });
                    const req = next
                      ? apiClient.bookmarkVideo(activeVideo.id, token)
                      : apiClient.unbookmarkVideo(activeVideo.id, token);
                    req.catch(() => {
                      setBookmarked(!next);
                      patchVideoById(activeVideo.id, { bookmarkCount: prevBm });
                    });
                  }}
                >
                  <IoBookmark
                    className={
                      bookmarked
                        ? "text-xl text-[#FACE15]"
                        : "text-xl text-white"
                    }
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.bookmarkCount)}
                </span>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-label="Chia sẻ"
                  onClick={async () => {
                    if (!isBackendVideoId(activeVideo?.id)) {
                      setShared((prev) => !prev);
                      return;
                    }
                    const vid = activeVideo.id;
                    const prevShares = Number(activeVideo.shareCount ?? 0);
                    try {
                      await apiClient.recordVideoShare(vid);
                      patchVideoById(vid, { shareCount: prevShares + 1 });
                    } catch {
                      /* vẫn cho chia sẻ cục bộ */
                    }
                    const shareUrl = `${window.location.origin}/foryou?v=${encodeURIComponent(vid)}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: "Vibely",
                          text: activeVideo.title ?? "",
                          url: shareUrl,
                        });
                      } else if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(shareUrl);
                      }
                    } catch {
                      /* người dùng huỷ hoặc trình duyệt không hỗ trợ */
                    }
                    setShared(true);
                  }}
                >
                  <IoArrowRedo className={shared ? "text-white" : ""} />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(activeVideo?.shareCount)}
                </span>
                <button
                  type="button"
                  aria-label="Âm thanh đang phát"
                  className="relative mt-1 flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/35 bg-zinc-950 shadow-lg"
                  onClick={() => {
                    const rawAudioUrl = String(activeVideo?.audioUrl ?? "").trim();
                    if (!rawAudioUrl) return;
                    const q = new URLSearchParams({
                      audioUrl: rawAudioUrl,
                      title: String(activeVideo?.audioTitle ?? "").trim(),
                      creator: resolveFeedAuthorDisplayName(activeVideo),
                    });
                    const av = String(activeVideo?.avatarUrl ?? "").trim();
                    if (av) q.set("creatorAvatar", av);
                    const un = String(activeVideo?.authorUsername ?? "")
                      .trim()
                      .replace(/^@/, "");
                    if (un) q.set("creatorUsername", un);
                    const sid = activeVideo?.id;
                    if (sid != null && /^\d+$/.test(String(sid))) {
                      q.set("sourceVideoId", String(sid));
                    }
                    navigate(`/sound?${q.toString()}`);
                  }}
                >
                  <img
                    src={
                      activeVideo?.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR
                    }
                    alt=""
                    className="h-full w-full scale-110 object-cover animate-[spin_12s_linear_infinite]"
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {videos.length > 0 ? (
          <FeedChevronNav
            variant={feedCommentsOpen ? "dock" : "float"}
            activeIndex={activeIndex}
            videoCount={videos.length}
            setActiveIndex={setActiveIndex}
            virtualFeedRef={virtualFeedRef}
          />
        ) : null}

        {feedCommentsOpen && videos.length > 0 ? (
          <aside
            className="relative z-0 flex h-full min-h-0 w-[min(380px,42vw)] shrink-0 flex-col border-l border-zinc-800 bg-black pt-[4.5rem] text-zinc-100 shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]"
            aria-label="Bình luận và đề xuất"
          >
            <div className="relative z-10 flex shrink-0 items-stretch border-b border-zinc-800 bg-black">
              <div className="flex min-w-0 flex-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={feedSidePanelTab === "comments"}
                  className={`min-w-0 flex-1 border-b-2 px-2 py-3 text-left text-[15px] font-semibold transition-colors sm:px-3 ${
                    feedSidePanelTab === "comments"
                      ? "border-white text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                  onClick={() => setFeedSidePanelTab("comments")}
                >
                  Bình luận{" "}
                  <span className="font-normal text-zinc-400">
                    {formatCompactCount(activeVideo?.commentCount)}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={feedSidePanelTab === "suggested"}
                  className={`min-w-0 flex-1 border-b-2 px-2 py-3 text-left text-[15px] font-semibold transition-colors sm:px-3 ${
                    feedSidePanelTab === "suggested"
                      ? "border-white text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                  onClick={() => setFeedSidePanelTab("suggested")}
                >
                  Bạn có thể thích
                </button>
              </div>
            </div>

            {feedSidePanelTab === "comments" ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
                  {!isBackendVideoId(activeVideo?.id) ? (
                    <p className="px-3 py-8 text-center text-sm text-zinc-500">
                      Bình luận chỉ khả dụng cho video trên Vibely (đã đăng nhập).
                    </p>
                  ) : feedCommentsLoading ? (
                    <p className="px-3 py-8 text-center text-sm text-zinc-500">
                      Đang tải bình luận…
                    </p>
                  ) : feedCommentsError ? (
                    <p className="px-3 py-8 text-center text-sm text-red-400">
                      {feedCommentsError}
                    </p>
                  ) : feedComments.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-zinc-500">
                      Chưa có bình luận — hãy là người đầu tiên.
                    </p>
                  ) : (
                    feedComments.map((c) => (
                      <div
                        key={String(c.id)}
                        className="flex gap-2.5 border-b border-zinc-800/70 px-3 py-3 last:border-b-0"
                      >
                        <img
                          src={
                            c.authorAvatarUrl &&
                            String(c.authorAvatarUrl).trim()
                              ? String(c.authorAvatarUrl).trim()
                              : FEED_DEFAULT_AUTHOR_AVATAR
                          }
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-100">
                            {c.username ?? "Người dùng"}
                          </p>
                          <p className="mt-0.5 text-[15px] leading-snug text-zinc-200">
                            {c.content}
                          </p>
                          <div className="mt-1 text-xs text-zinc-500">
                            {formatRelativeTimeVi(c.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1 border-t border-zinc-800 px-3 pt-2 pb-3">
                  {commentPostError ? (
                    <p className="text-xs text-red-400">{commentPostError}</p>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <img
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                      src={
                        user?.avatarUrl && String(user.avatarUrl).trim()
                          ? user.avatarUrl
                          : DEFAULT_USER_AVATAR_URL
                      }
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_USER_AVATAR_URL;
                      }}
                    />
                    <div className="relative min-w-0 flex-1">
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={
                          token
                            ? "Thêm bình luận..."
                            : "Đăng nhập để bình luận..."
                        }
                        disabled={
                          !token || !isBackendVideoId(activeVideo?.id)
                        }
                        className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-4 pr-[5.25rem] text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-red-500/20 focus:border-zinc-600 focus:ring-2 disabled:opacity-50"
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded-full px-2 py-1 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                          aria-label="Nhắc tên"
                        >
                          @
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                          aria-label="Chèn biểu tượng cảm xúc"
                        >
                          <IoHappyOutline className="text-lg" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Gửi bình luận"
                      disabled={
                        !commentDraft.trim() ||
                        !token ||
                        !isBackendVideoId(activeVideo?.id)
                      }
                      onClick={async () => {
                        const text = commentDraft.trim();
                        if (
                          !text ||
                          !token ||
                          !isBackendVideoId(activeVideo?.id)
                        ) {
                          return;
                        }
                        setCommentPostError("");
                        try {
                          const created = await apiClient.addComment(
                            activeVideo.id,
                            text,
                            token,
                          );
                          setCommentDraft("");
                          setFeedComments((prev) => [created, ...prev]);
                          const prevCc = Number(activeVideo.commentCount ?? 0);
                          patchVideoById(activeVideo.id, {
                            commentCount: prevCc + 1,
                          });
                        } catch (e) {
                          setCommentPostError(
                            e instanceof Error
                              ? e.message
                              : "Không gửi được bình luận.",
                          );
                        }
                      }}
                    >
                      <IoArrowUp className="text-xl" aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                {suggestedFeedSlots.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-zinc-500">
                    Chưa có video gợi ý khác.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {suggestedFeedSlots.map(({ video, idx }) => (
                      <button
                        key={String(video.id ?? idx)}
                        type="button"
                        className="group text-left"
                        onClick={() => setActiveIndex(idx)}
                      >
                        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 transition group-hover:ring-zinc-600">
                          <img
                            src={
                              video.thumbnailUrl ?? FEED_DEFAULT_AUTHOR_AVATAR
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[11px] font-semibold text-white drop-shadow-md">
                            <IoVideocam className="text-xs opacity-90" aria-hidden />
                            {formatCompactCount(video.likeCount ?? 0)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-zinc-200">
                          {video.title ?? "Video"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          @
                          {String(
                            video.authorUsername ?? "vibely",
                          ).replace(/^@/, "")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        ) : null}
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold leading-snug">
              Bạn có chắc chắn muốn đăng xuất?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function FeedPage() {
  const { token, user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/foryou") {
      document.title = "Xem các video thịnh hành dành cho bạn | Vibely";
    } else if (location.pathname === "/feed") {
      document.title = "Xem các video thịnh hành dành cho bạn | Vibely";
    }
  }, [location.pathname]);

  return <ForYouFeedPage token={token} user={user} onLogout={logout} />;
}
