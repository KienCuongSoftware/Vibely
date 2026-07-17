import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IoClose, IoEyeOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import {
  buildProfileEmbedSnippet,
  buildShareableProfileUrl,
  normalizeShareUsername,
} from "../utils/shareUrl.js";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

function formatCompactCount(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return "0";
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * TikTok-style "Nhúng hồ sơ" modal: preview card + embed code + copy.
 */
export function ProfileEmbedModal({
  open,
  onClose,
  profile,
  videos = [],
}) {
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const username = normalizeShareUsername(profile?.username);
  const displayName =
    String(profile?.displayName ?? "").trim() || username || "Vibely";
  const avatar = String(profile?.avatarUrl ?? "").trim() || DEFAULT_AVATAR;
  const bio = String(profile?.bio ?? "").trim();
  const profileUrl = useMemo(
    () => (username ? buildShareableProfileUrl(username).split("?")[0] : ""),
    [username],
  );
  const snippet = useMemo(
    () => (username ? buildProfileEmbedSnippet(username) : ""),
    [username],
  );
  const previewVideos = useMemo(
    () => (Array.isArray(videos) ? videos.filter(Boolean).slice(0, 8) : []),
    [videos],
  );

  useEffect(() => {
    if (!open) {
      setToast("");
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const copyCode = useCallback(async () => {
    if (!snippet) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(snippet);
      showToast("Đã sao chép mã nhúng");
    } catch {
      showToast("Không sao chép được mã nhúng");
    } finally {
      setBusy(false);
    }
  }, [snippet, showToast]);

  if (!open || !username) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-embed-title"
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-[#1f1f1f] text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-white/10 px-5 py-4">
          <h2 id="profile-embed-title" className="text-lg font-semibold">
            Nhúng hồ sơ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10"
            aria-label="Đóng"
          >
            <IoClose className="text-[22px]" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
              <div className="flex items-start gap-3 p-4">
                <img
                  src={avatar}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">
                    @{username}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-zinc-400">
                    {displayName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
                    <span>
                      <strong className="text-white">
                        {formatCompactCount(profile?.followingCount)}
                      </strong>{" "}
                      Đang Follow
                    </span>
                    <span>
                      <strong className="text-white">
                        {formatCompactCount(profile?.followerCount)}
                      </strong>{" "}
                      Follower
                    </span>
                    <span>
                      <strong className="text-white">
                        {formatCompactCount(profile?.totalLikeCount)}
                      </strong>{" "}
                      Thích
                    </span>
                  </div>
                </div>
              </div>

              {bio ? (
                <p className="line-clamp-3 px-4 pb-3 text-sm leading-snug text-zinc-300">
                  {bio}
                </p>
              ) : null}

              {previewVideos.length > 0 ? (
                <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-4">
                  {previewVideos.map((video) => {
                    const thumb =
                      String(video?.thumbnailUrl ?? "").trim() || null;
                    const views = formatCompactCount(
                      video?.viewCount ?? video?.views ?? 0,
                    );
                    return (
                      <div
                        key={String(video.publicId ?? video.id)}
                        className="relative h-[132px] w-[96px] shrink-0 overflow-hidden rounded-md bg-zinc-800"
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
                          <IoEyeOutline aria-hidden />
                          {views}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 pb-4 text-sm text-zinc-500">
                  Chưa có video công khai để xem trước.
                </p>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <span className="text-sm font-bold tracking-tight text-white">
                  Vibely
                </span>
                <Link
                  to={`/@${username}`}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#fe2c55] px-4 text-sm font-semibold text-white transition hover:bg-[#db2449]"
                  onClick={onClose}
                >
                  Mở Vibely
                </Link>
              </div>
            </div>
          </section>

          <section className="flex flex-col p-4 sm:p-5">
            <p className="text-sm text-zinc-300">
              Video từ tài khoản này sẽ hiển thị
            </p>
            <pre className="scrollbar-none mt-3 max-h-[240px] flex-1 overflow-auto rounded-xl border border-white/10 bg-[#121212] p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all text-zinc-300">
              {snippet}
            </pre>
            <button
              type="button"
              disabled={busy || !snippet}
              onClick={() => void copyCode()}
              className="mt-4 h-11 w-full cursor-pointer rounded-lg bg-[#fe2c55] text-sm font-bold text-white transition hover:bg-[#db2449] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Đang sao chép…" : "Sao chép mã"}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              Bằng việc nhúng, bạn đồng ý với điều khoản dịch vụ và chính sách
              quyền riêng tư của Vibely. Xem trước:{" "}
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                {profileUrl}
              </a>
            </p>
          </section>
        </div>

        {toast ? (
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-900/95 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
