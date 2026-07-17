import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IoClose } from "react-icons/io5";
import { ProfileEmbedPreview } from "./ProfileEmbedPreview.jsx";
import {
  buildProfileEmbedSnippet,
  buildShareableProfileEmbedUrl,
  buildShareableProfileUrl,
  normalizeShareUsername,
} from "../utils/shareUrl.js";

/**
 * TikTok-style "Nhúng hồ sơ": left = dark embed preview page, right = code.
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
  const profileUrl = useMemo(
    () => (username ? buildShareableProfileUrl(username).split("?")[0] : ""),
    [username],
  );
  const embedPageUrl = useMemo(
    () => (username ? buildShareableProfileEmbedUrl(username) : ""),
    [username],
  );
  const snippet = useMemo(
    () => (username ? buildProfileEmbedSnippet(username) : ""),
    [username],
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
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-3 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-embed-title"
        className="relative flex max-h-[min(94vh,760px)] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-[#252525] text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex shrink-0 items-center px-5 py-4">
          <h2 id="profile-embed-title" className="text-[17px] font-semibold">
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

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 pb-5 sm:px-5 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
          {/* Left: standalone dark preview page (TikTok embed card) */}
          <div className="mx-auto flex w-full max-w-[420px] justify-center lg:mx-0 lg:max-h-full lg:overflow-hidden">
            <ProfileEmbedPreview
              className="h-full max-h-[min(640px,70vh)] w-full"
              username={username}
              displayName={displayName}
              avatarUrl={profile?.avatarUrl}
              bio={profile?.bio}
              followingCount={profile?.followingCount}
              followerCount={profile?.followerCount}
              totalLikeCount={profile?.totalLikeCount}
              videos={videos}
              profileHref={`/@${username}`}
            />
          </div>

          {/* Right: embed code */}
          <section className="flex min-h-0 flex-col lg:overflow-hidden">
            <p className="text-[15px] text-zinc-200">
              Video từ tài khoản này sẽ hiển thị
            </p>
            <pre className="scrollbar-none mt-3 max-h-[280px] min-h-[160px] flex-1 overflow-auto rounded-xl bg-[#1a1a1a] p-4 text-[12px] leading-relaxed whitespace-pre-wrap break-all text-zinc-400 lg:max-h-none">
              {snippet}
            </pre>
            <button
              type="button"
              disabled={busy || !snippet}
              onClick={() => void copyCode()}
              className="mt-4 h-12 w-full cursor-pointer rounded-lg bg-[#3a3a3a] text-[15px] font-semibold text-white transition hover:bg-[#4a4a4a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Đang sao chép…" : "Sao chép mã"}
            </button>
            <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
              Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và xác nhận
              rằng bạn đã đọc{" "}
              <a
                href="/legal/page/row/privacy-policy"
                className="text-zinc-300 hover:underline"
              >
                Chính sách quyền riêng tư
              </a>{" "}
              của chúng tôi để hiểu cách chúng tôi thu thập, sử dụng và chia sẻ
              dữ liệu của bạn. Xem trước trang nhúng:{" "}
              <a
                href={embedPageUrl || profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                {embedPageUrl || profileUrl}
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
