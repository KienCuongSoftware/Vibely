import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaFacebookF,
  FaTelegramPlane,
  FaWhatsapp,
} from "react-icons/fa";
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoCodeSlash,
  IoLink,
  IoMailOutline,
} from "react-icons/io5";
import { SiX } from "react-icons/si";
import { buildPlatformShareUrl } from "../utils/shareLinks.js";
import { buildShareableProfileUrl } from "../utils/shareUrl.js";

const SCROLL_ARROW =
  "share-modal-scroll-arrow pointer-events-none absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#3a3a3a]/95 text-2xl text-white shadow-lg opacity-0 transition-all duration-200 group-hover/share-modal:pointer-events-auto group-hover/share-modal:opacity-100 hover:bg-[#505050] hover:brightness-110";

function ShareModalScrollRow({ children, className = "" }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [children, updateScrollState]);

  const scrollBy = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      {canScrollLeft ? (
        <button
          type="button"
          aria-label="Cuộn trái"
          className={`${SCROLL_ARROW} left-1`}
          onClick={() => scrollBy(-1)}
        >
          <IoChevronBack aria-hidden />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          aria-label="Cuộn phải"
          className={`${SCROLL_ARROW} right-1`}
          onClick={() => scrollBy(1)}
        >
          <IoChevronForward aria-hidden />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className="share-modal-scroll flex gap-3 overflow-x-auto px-2 pb-2 pt-1"
      >
        {children}
      </div>
    </div>
  );
}

function ShareCircleButton({ label, bgClass, icon, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex w-[96px] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl px-1.5 py-2.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span
        className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-2xl text-white shadow-md transition group-hover:brightness-110 group-hover:shadow-lg ${bgClass}`}
      >
        {icon}
      </span>
      <span className="max-w-full truncate text-center text-xs leading-tight text-zinc-100 transition group-hover:text-white">
        {label}
      </span>
    </button>
  );
}

/**
 * Profile share sheet — same visual language as VideoShareModal.
 */
export function ProfileShareModal({
  open,
  onClose,
  username,
  displayName = "",
  onOpenEmbed,
}) {
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const canShare = useMemo(
    () =>
      Boolean(
        String(username ?? "")
          .trim()
          .replace(/^@+/, ""),
      ),
    [username],
  );

  const profileUrlFor = useCallback(
    (shareMethod) =>
      open && canShare
        ? buildShareableProfileUrl(username, { shareMethod })
        : "",
    [open, canShare, username],
  );

  const shareTitle = useMemo(() => {
    const handle = String(username ?? "")
      .trim()
      .replace(/^@+/, "");
    const name = String(displayName ?? "").trim();
    if (name && handle) return `${name} (@${handle}) trên Vibely`;
    if (handle) return `@${handle} trên Vibely`;
    return "Hồ sơ Vibely";
  }, [username, displayName]);

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

  const copyText = useCallback(
    async (text) => {
      const value = String(text ?? "").trim();
      if (!value) return;
      setBusy(true);
      try {
        await navigator.clipboard.writeText(value);
        showToast("Đã sao chép liên kết");
      } catch {
        showToast("Không sao chép được liên kết");
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const openPlatform = useCallback(
    (channel) => {
      const trackedUrl = profileUrlFor(channel);
      const url = buildPlatformShareUrl(channel, {
        url: trackedUrl,
        title: shareTitle,
      });
      if (!url) return;
      if (channel === "email") {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      onClose?.();
    },
    [profileUrlFor, shareTitle, onClose],
  );

  if (!open || !canShare) return null;

  return (
    <div
      className="fixed inset-0 z-120 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-share-modal-title"
        className="share-modal-panel group/share-modal w-full max-w-[560px] rounded-t-2xl bg-[#252525] text-zinc-100 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex items-center justify-center border-b border-white/10 px-5 py-4">
          <h2 id="profile-share-modal-title" className="text-lg font-semibold">
            Chia sẻ đến
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

        <div className="min-h-[188px] px-3 py-5">
          <ShareModalScrollRow className="px-1">
            <ShareCircleButton
              label="Copy"
              bgClass="bg-[#0075DC]"
              icon={<IoLink className="text-[30px]" aria-hidden />}
              disabled={busy}
              onClick={() => void copyText(profileUrlFor("copy_link"))}
            />
            <ShareCircleButton
              label="WhatsApp"
              bgClass="bg-[#25D366]"
              icon={<FaWhatsapp className="text-[28px]" aria-hidden />}
              disabled={busy}
              onClick={() => openPlatform("whatsapp")}
            />
            <ShareCircleButton
              label="Nhúng"
              bgClass="bg-[#20D5EC]"
              icon={<IoCodeSlash className="text-[30px] text-black" aria-hidden />}
              disabled={busy}
              onClick={() => {
                onClose?.();
                onOpenEmbed?.();
              }}
            />
            <ShareCircleButton
              label="Facebook"
              bgClass="bg-[#1877F2]"
              icon={<FaFacebookF className="text-[26px]" aria-hidden />}
              disabled={busy}
              onClick={() => openPlatform("facebook")}
            />
            <ShareCircleButton
              label="Telegram"
              bgClass="bg-[#29A9EA]"
              icon={<FaTelegramPlane className="text-[26px]" aria-hidden />}
              disabled={busy}
              onClick={() => openPlatform("telegram")}
            />
            <ShareCircleButton
              label="X"
              bgClass="bg-black ring-1 ring-zinc-600"
              icon={<SiX className="text-[22px]" aria-hidden />}
              disabled={busy}
              onClick={() => openPlatform("twitter")}
            />
            <ShareCircleButton
              label="Email"
              bgClass="bg-[#5B9BD5]"
              icon={<IoMailOutline className="text-[30px]" aria-hidden />}
              disabled={busy}
              onClick={() => openPlatform("email")}
            />
          </ShareModalScrollRow>
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
