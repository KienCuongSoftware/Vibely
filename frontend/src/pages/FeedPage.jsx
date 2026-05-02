import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../state/useAuth";
import { Sidebar } from "../components/Sidebar";
import { TooltipHoverWrap } from "../components/TooltipControls";
import { AccountActionsPill } from "../components/AccountActionsPill";
import {
  IoArrowRedo,
  IoBookmark,
  IoChatbubble,
  IoChevronDown,
  IoChevronUp,
  IoCompass,
  IoEllipsisHorizontal,
  IoHeart,
  IoHome,
  IoLogOutOutline,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoVideocam,
} from "react-icons/io5";
import {
  LuArrowDownFromLine,
  LuFlag,
  LuHeartOff,
  LuPictureInPicture2,
} from "react-icons/lu";
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

const guestFallbackVideos = [
  {
    id: "guest-1",
    title: "Mèo chill buổi tối",
    description: "Video demo giao diện Vibely cho chế độ chưa đăng nhập.",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://picsum.photos/seed/vibely-guest/720/1280",
    avatarUrl: "https://i.pravatar.cc/120?img=15",
    authorUsername: "vibely_demo",
    authorDisplayName: "Nguyễn Minh Demo",
    likeCount: 1600000,
    commentCount: 9007,
    shareCount: 770400,
    favoriteCount: 119400,
  },
  {
    id: "guest-2",
    title: "Joyride demo",
    description: "Video mẫu thứ hai — dùng mũi tên lên/xuống để chuyển.",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl: "https://picsum.photos/seed/vibely-guest-2/720/1280",
    avatarUrl: "https://i.pravatar.cc/120?img=33",
    authorUsername: "vibely_demo_2",
    authorDisplayName: "Trần Lan Demo",
    likeCount: 885000,
    commentCount: 4200,
    shareCount: 312000,
    favoriteCount: 98000,
  },
];

function ForYouFeedPage({ token, user, onLogout }) {
  const navigate = useNavigate();
  const [videos, setVideos] = useState(guestFallbackVideos);
  const [activeIndex, setActiveIndex] = useState(0);
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
  const [feedAutoScrollEnabled, setFeedAutoScrollEnabled] = useState(false);

  const activeVideo = videos[activeIndex] ?? guestFallbackVideos[0];

  useEffect(() => {
    let isMounted = true;
    const request =
      token && activeMenu === "following"
        ? apiClient.getFollowingFeed(token, { page: 0, size: 8 })
        : apiClient.getFeed({ page: 0, size: 8, sort: "latest" });

    request
      .then((response) => {
        const items = response?.items ?? [];
        if (!isMounted || items.length === 0) return;
        const normalized = items.map((item) => ({
          ...item,
          authorDisplayName:
            item.authorDisplayName != null &&
            String(item.authorDisplayName).trim()
              ? String(item.authorDisplayName).trim()
              : undefined,
          avatarUrl: `https://i.pravatar.cc/120?u=${encodeURIComponent(item.authorUsername ?? item.id)}`,
          shareCount: item.likeCount ? item.likeCount * 2 : 1280,
          favoriteCount: item.commentCount ? item.commentCount * 3 : 640,
        }));
        setVideos(normalized);
      })
      .catch(() => {
        if (isMounted) {
          setVideos(guestFallbackVideos);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [token, activeMenu]);

  useEffect(() => {
    setActiveIndex((idx) => {
      if (videos.length === 0) return 0;
      return Math.min(Math.max(0, idx), videos.length - 1);
    });
  }, [videos]);

  useEffect(() => {
    setLiked(false);
    setBookmarked(false);
    setShared(false);
  }, [activeIndex]);

  useEffect(() => {
    setFeedMoreMenuOpen(false);
  }, [activeIndex]);

  useEffect(() => {
    if (!feedMoreMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setFeedMoreMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedMoreMenuOpen]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo.videoUrl) return undefined;
    const onTime = () => {
      if (el.duration && Number.isFinite(el.duration)) {
        setFeedProgressPct((el.currentTime / el.duration) * 100);
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onTime);
    el.addEventListener("durationchange", onTime);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onTime);
      el.removeEventListener("durationchange", onTime);
    };
  }, [activeVideo.id, activeVideo.videoUrl]);

  useEffect(() => {
    const el = feedVideoRef.current;
    if (!el || !activeVideo.videoUrl) return;
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
  }, [activeIndex, activeVideo.id, activeVideo.videoUrl]);

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
    setActiveMenu(id);
  };

  const toggleFeedPlayback = () => {
    const el = feedVideoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

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

  const actionCircle =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/40 text-lg text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:bg-black/55";

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

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 py-5">
        <AccountActionsPill className="absolute right-8 top-5 z-10" tone="profile">
          {!token ? (
            <Link
              to="/login"
              className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs font-semibold leading-none text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản">
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
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
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

        <div className="group relative h-[88vh] max-h-[860px] w-[min(390px,92vw)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl">
          {activeVideo.videoUrl ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[9] h-[42%] max-h-56 bg-linear-to-b from-black/60 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          ) : null}

          {activeVideo.videoUrl ? (
            <video
              key={activeVideo.id ?? activeIndex}
              ref={feedVideoRef}
              className="h-full w-full cursor-pointer object-cover"
              src={activeVideo.videoUrl}
              poster={activeVideo.thumbnailUrl ?? undefined}
              playsInline
              muted={feedMuted}
              loop
              onClick={toggleFeedPlayback}
            />
          ) : (
            <img
              className="h-full w-full object-cover"
              src={
                activeVideo.thumbnailUrl ?? guestFallbackVideos[0].thumbnailUrl
              }
              alt={activeVideo.title}
            />
          )}

          {feedMoreMenuOpen && activeVideo.videoUrl ? (
            <button
              type="button"
              aria-label="Đóng tuỳ chọn video"
              className="absolute inset-0 z-[10] cursor-default rounded-xl bg-black/45 transition-colors sm:rounded-2xl"
              onMouseDown={(e) => {
                e.preventDefault();
                setFeedMoreMenuOpen(false);
              }}
            />
          ) : null}

          {activeVideo.videoUrl ? (
            <div className="pointer-events-none absolute inset-0 z-[11] flex flex-col justify-end">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[50] flex items-start justify-between px-3 pt-3">
                <button
                  type="button"
                  aria-label={
                    feedMuted ? "Bật âm thanh" : "Tắt âm thanh"
                  }
                  className="pointer-events-none cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedMuted((m) => !m);
                  }}
                >
                  {feedMuted ? (
                    <IoVolumeMuteOutline aria-hidden />
                  ) : (
                    <IoVolumeHighOutline aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Tuỳ chọn video"
                  aria-expanded={feedMoreMenuOpen}
                  aria-haspopup="dialog"
                  className={`cursor-pointer rounded-full bg-black/45 p-2.5 text-xl text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/60 focus-visible:pointer-events-auto focus-visible:opacity-100 ${
                    feedMoreMenuOpen
                      ? "pointer-events-auto opacity-100"
                      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedMoreMenuOpen((open) => !open);
                  }}
                >
                  <IoEllipsisHorizontal aria-hidden />
                </button>
              </div>

              {feedMoreMenuOpen ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Tuỳ chọn video"
                  className="feed-video-more-panel pointer-events-auto absolute top-[68px] right-[6px] z-40 w-[min(232px,calc(100%-12px))] overflow-visible"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-[-5px] right-[21px] z-10 h-2.5 w-2.5 rotate-45 rounded-[1px] border-l border-t border-white/18 bg-[rgba(72,72,74,0.92)] shadow-sm"
                  />
                  <div className="overflow-hidden rounded-xl border border-white/18 bg-[rgba(72,72,74,0.92)] py-1 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                      HD
                    </span>
                    <span className="min-w-0 flex-1 font-medium">
                      Chất lượng
                    </span>
                    <span className="shrink-0 text-[15px] text-white/55">
                      Tự động
                    </span>
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/28 text-[10px] font-semibold tracking-wide text-white/95">
                      CC
                    </span>
                    <span className="font-medium">Phụ đề</span>
                  </button>

                  <div className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-[15px] leading-snug text-white">
                    <LuArrowDownFromLine
                      strokeWidth={1.5}
                      className="h-[22px] w-[22px] shrink-0 text-white"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 font-medium">
                      Cuộn tự động
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={feedAutoScrollEnabled}
                      className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${feedAutoScrollEnabled ? "bg-red-600" : "bg-white/30"}`}
                      onClick={() =>
                        setFeedAutoScrollEnabled((prev) => !prev)
                      }
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${feedAutoScrollEnabled ? "translate-x-[26px]" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                    onClick={() => void toggleFeedPictureInPicture()}
                  >
                    <LuPictureInPicture2
                      strokeWidth={1.5}
                      className="h-[22px] w-[22px] shrink-0 text-white"
                      aria-hidden
                    />
                    <span className="font-medium">Trình phát nổi</span>
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-white/10 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                    onClick={() => setFeedMoreMenuOpen(false)}
                  >
                    <LuHeartOff
                      strokeWidth={1.5}
                      className="h-[22px] w-[22px] shrink-0 text-white"
                      aria-hidden
                    />
                    <span className="font-medium">Không quan tâm</span>
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3.5 py-[13px] text-left text-[15px] leading-snug text-white transition-colors hover:bg-white/10 active:bg-white/14"
                    onClick={() => setFeedMoreMenuOpen(false)}
                  >
                    <LuFlag
                      strokeWidth={1.5}
                      className="h-[22px] w-[22px] shrink-0 text-white"
                      aria-hidden
                    />
                    <span className="font-medium">Báo cáo</span>
                  </button>
                  </div>
                </div>
              ) : null}

              <div className="pointer-events-auto bg-linear-to-t from-black/85 via-black/25 to-transparent px-3 pb-10 pt-12 sm:px-4 sm:pb-11 sm:pt-16">
                <p className="text-[15px] font-bold leading-snug text-white drop-shadow-md">
                  {resolveFeedAuthorDisplayName(activeVideo)}
                </p>
                {activeVideo.description &&
                String(activeVideo.description).trim() ? (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-white/90 drop-shadow">
                    {String(activeVideo.description).trim()}
                  </p>
                ) : null}
              </div>

              <div
                ref={feedProgressTrackRef}
                className="group/progress pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex min-h-12 w-full cursor-pointer flex-col justify-end pb-1"
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(feedProgressPct)}
                aria-label="Tiến độ phát"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  feedProgressScrubbingRef.current = true;
                  setFeedProgressScrubbing(true);
                  seekFeedVideo(e.clientX, feedProgressTrackRef.current);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  feedProgressScrubbingRef.current = true;
                  setFeedProgressScrubbing(true);
                  const cx = e.touches[0]?.clientX;
                  if (cx != null) seekFeedVideo(cx, feedProgressTrackRef.current);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  const el = feedVideoRef.current;
                  if (!el?.duration || !Number.isFinite(el.duration)) return;
                  const delta = e.key === "ArrowLeft" ? -5 : 5;
                  el.currentTime = Math.min(
                    el.duration,
                    Math.max(0, el.currentTime + delta),
                  );
                  setFeedProgressPct((el.currentTime / el.duration) * 100);
                }}
              >
                <div className="relative flex w-full items-center py-2">
                  <div className="relative h-[4px] w-full transition-[height] duration-150 ease-out group-hover/progress:h-[6px]">
                    <div className="absolute inset-0 rounded-full bg-white/30" />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full bg-red-600 ${feedProgressScrubbing ? "" : "transition-[width] duration-150 ease-out"}`}
                      style={{
                        width: `${feedProgressPct}%`,
                        maxWidth: "100%",
                      }}
                    />
                    <div
                      className={`pointer-events-none absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ring-2 ring-black/25 transition-[opacity,transform] duration-200 ease-out ${feedProgressScrubbing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} group-hover:scale-110`}
                      style={{ left: `${feedProgressPct}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4">
              <p className="text-sm font-semibold text-white">
                {resolveFeedAuthorDisplayName(activeVideo)}
              </p>
              {activeVideo.description &&
              String(activeVideo.description).trim() ? (
                <p className="mt-1 text-xs text-zinc-300">
                  {String(activeVideo.description).trim()}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col items-center gap-3">
          <button
            type="button"
            className="relative h-12 w-12 cursor-pointer rounded-full border-2 border-white/90 bg-zinc-700 p-[2px]"
          >
            <img
              className="h-full w-full rounded-full object-cover"
              src={activeVideo.avatarUrl ?? "https://i.pravatar.cc/120?img=15"}
              alt={`avatar-${activeVideo.authorUsername}`}
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-1 text-[10px] leading-3 text-white">
              +
            </span>
          </button>
          <button
            type="button"
            className={actionCircle}
            onClick={() => setLiked((prev) => !prev)}
          >
            <IoHeart className={liked ? "text-red-500" : ""} />
          </button>
          <span className="text-xs text-zinc-300">
            {formatCompactCount(activeVideo.likeCount)}
          </span>
          <button type="button" className={actionCircle}>
            <IoChatbubble />
          </button>
          <span className="text-xs text-zinc-300">
            {formatCompactCount(activeVideo.commentCount)}
          </span>
          <button
            type="button"
            className={actionCircle}
            onClick={() => setBookmarked((prev) => !prev)}
          >
            <IoBookmark className={bookmarked ? "text-white" : ""} />
          </button>
          <span className="text-xs text-zinc-300">
            {formatCompactCount(activeVideo.favoriteCount)}
          </span>
          <button
            type="button"
            className={actionCircle}
            onClick={() => setShared((prev) => !prev)}
          >
            <IoArrowRedo className={shared ? "text-white" : ""} />
          </button>
          <span className="text-xs text-zinc-300">
            {formatCompactCount(activeVideo.shareCount)}
          </span>
          <button
            type="button"
            aria-label="Âm thanh đang phát"
            className="relative mt-1 flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/35 bg-zinc-950 shadow-lg"
          >
            <img
              src={
                activeVideo.avatarUrl ?? "https://i.pravatar.cc/120?img=15"
              }
              alt=""
              className="h-full w-full scale-110 object-cover animate-[spin_12s_linear_infinite]"
            />
          </button>
        </div>

        <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5">
          <button
            type="button"
            aria-label="Video trước"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-600/90 bg-zinc-900/95 text-xl text-zinc-100 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
          >
            <IoChevronUp aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Video tiếp theo"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-600/90 bg-zinc-900/95 text-xl text-zinc-100 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeIndex >= videos.length - 1}
            onClick={() =>
              setActiveIndex((prev) => Math.min(prev + 1, videos.length - 1))
            }
          >
            <IoChevronDown aria-hidden />
          </button>
        </div>
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
