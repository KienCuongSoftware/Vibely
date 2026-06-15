import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaFacebookF,
  FaLinkedinIn,
  FaTelegramPlane,
  FaWhatsapp,
} from "react-icons/fa";
import {
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoCodeSlash,
  IoLink,
  IoMailOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { SiX } from "react-icons/si";
import { apiClient } from "../api/client";
import {
  buildShareableEmbedUrl,
  buildShareableVideoUrl,
  buildCurrentPageShareUrl,
} from "../utils/shareUrl.js";
import { buildPlatformShareUrl, shareIdempotencyKey } from "../utils/shareLinks.js";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";
const SHARED_VIDEO_ID_PREFIX = "__vshare__:";

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

function FriendChip({ friend, onClick }) {
  const name =
    String(friend?.displayName ?? friend?.username ?? "Bạn bè").trim() ||
    "Bạn bè";
  const avatar = String(friend?.avatarUrl ?? "").trim() || DEFAULT_AVATAR;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[92px] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl px-1.5 py-2.5 transition-colors hover:bg-white/10"
    >
      <span className="relative h-[68px] w-[68px] overflow-hidden rounded-full bg-zinc-700 ring-1 ring-white/10 transition group-hover:brightness-110 group-hover:ring-white/25">
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="max-w-full truncate text-center text-xs text-zinc-100 transition group-hover:text-white">
        {name}
      </span>
    </button>
  );
}

function ConversationRecipientChip({ row, selected, onToggle, disabled = false }) {
  const name = String(row?.peerDisplayName ?? row?.peerUsername ?? "Người dùng").trim() || "Người dùng";
  const avatar = String(row?.peerAvatarUrl ?? "").trim() || DEFAULT_AVATAR;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`group relative flex w-[92px] shrink-0 flex-col items-center gap-2 rounded-xl px-1.5 py-2.5 transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-white/10"
      }`}
    >
      <span className={`relative h-[68px] w-[68px] overflow-hidden rounded-full bg-zinc-700 ring-1 transition ${disabled ? "" : "group-hover:brightness-110"} ${selected ? "ring-pink-500/80" : "ring-white/10"} ${disabled ? "" : "group-hover:ring-white/25"}`}>
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      </span>
      {selected ? (
        <span className="absolute right-3 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-white">
          <IoCheckmarkCircle className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <span className="max-w-full truncate text-center text-xs text-zinc-100 transition group-hover:text-white">
        {name}
      </span>
    </button>
  );
}

export function VideoShareModal({
  open,
  onClose,
  videoPublicId,
  videoId: legacyVideoId,
  authorUsername,
  videoTitle = "",
  token,
  onShareCountChange,
}) {
  const videoId = videoPublicId ?? legacyVideoId;
  const [friends, setFriends] = useState([]);
  const [chatRecipients, setChatRecipients] = useState([]);
  const [selectedConversationIds, setSelectedConversationIds] = useState([]);
  const [directNote, setDirectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const watchUrl = useMemo(
    () => (open && videoId ? buildShareableVideoUrl(videoId, authorUsername) : ""),
    [open, videoId, authorUsername],
  );
  const embedUrl = useMemo(
    () => (open && videoId ? buildShareableEmbedUrl(videoId) : ""),
    [open, videoId],
  );

  useEffect(() => {
    if (!open) {
      setToast("");
      setSelectedConversationIds([]);
      setDirectNote("");
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

  useEffect(() => {
    if (!open || !token) {
      setFriends([]);
      setChatRecipients([]);
      return undefined;
    }
    let cancelled = false;
    apiClient
      .getMentionableFriends(token)
      .then((list) => {
        if (!cancelled) {
          setFriends(Array.isArray(list) ? list.slice(0, 10) : []);
        }
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      });
    apiClient
      .getChatConversations(token)
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        setChatRecipients(
          rows.filter((row) => {
            if (Number(row?.id) <= 0) return false;
            const hasRealMessage = Boolean(
              (typeof row?.lastMessage === "string" && row.lastMessage.trim()) ||
              row?.lastMessageAt,
            );
            return hasRealMessage;
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setChatRecipients([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const persistShare = useCallback(
    async (channel) => {
      if (!videoId) return null;
      if (token) {
        const data = await apiClient.createVideoShare(String(videoId), token, {
          channel,
          referrer: buildCurrentPageShareUrl() || null,
          idempotencyKey: shareIdempotencyKey(channel, videoId),
        });
        if (data?.shareCount != null) {
          onShareCountChange?.(Number(data.shareCount));
        }
        return data;
      }
      await apiClient.recordVideoShare(String(videoId));
      onShareCountChange?.(null);
      return null;
    },
    [videoId, token, onShareCountChange],
  );

  const recordShare = useCallback(
    async (channel) => {
      if (!videoId || busy) return null;
      setBusy(true);
      try {
        return await persistShare(channel);
      } finally {
        setBusy(false);
      }
    },
    [videoId, busy, persistShare],
  );

  const copyText = useCallback(
    async (text, channel = "copy") => {
      const value = String(text ?? "").trim();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        await recordShare(channel);
        showToast("Đã sao chép liên kết");
      } catch {
        showToast("Không sao chép được liên kết");
      }
    },
    [recordShare, showToast],
  );

  const openPlatform = useCallback(
    async (channel) => {
      const url = buildPlatformShareUrl(channel, {
        url: watchUrl,
        title: videoTitle || "Vibely",
      });
      if (!url) return;
      if (channel === "email") {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      try {
        await recordShare(channel);
        onClose?.();
      } catch {
        /* vẫn mở app chia sẻ */
        onClose?.();
      }
    },
    [watchUrl, videoTitle, recordShare, onClose],
  );

  const handleEmbed = useCallback(async () => {
    const snippet = `<iframe src="${embedUrl}" width="325" height="580" frameborder="0" allowfullscreen></iframe>`;
    await copyText(snippet, "embed");
  }, [embedUrl, copyText]);

  const sendToSelectedChats = useCallback(async () => {
    if (!token || selectedConversationIds.length === 0 || busy) return;
    setBusy(true);
    try {
      const note = String(directNote ?? "").trim();
      const normalizedVideoId = String(videoId ?? "").trim();
      if (!normalizedVideoId) return;
      const payload = note
        ? `${SHARED_VIDEO_ID_PREFIX}${normalizedVideoId}\n${note}`
        : `${SHARED_VIDEO_ID_PREFIX}${normalizedVideoId}`;
      const results = await Promise.allSettled(
        selectedConversationIds.map((conversationId) =>
          apiClient.sendChatMessage(conversationId, payload, token),
        ),
      );
      const successCount = results.filter((item) => item.status === "fulfilled").length;
      if (successCount === 0) {
        throw new Error("Không gửi được vào tin nhắn");
      }
      const toastMessage =
        successCount === selectedConversationIds.length
          ? "Đã gửi vào tin nhắn"
          : `Đã gửi ${successCount}/${selectedConversationIds.length} cuộc trò chuyện`;
      setSelectedConversationIds([]);
      setDirectNote("");
      onClose?.();
      showToast(toastMessage);
      try {
        await persistShare("direct");
      } catch {
        /* chat sent — share count is best-effort */
      }
    } catch {
      showToast("Không gửi được vào tin nhắn");
    } finally {
      setBusy(false);
    }
  }, [token, selectedConversationIds, busy, directNote, videoId, persistShare, showToast, onClose]);

  if (!open || !videoId) return null;

  return (
    <div
      className="fixed inset-0 z-120 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="share-modal-panel group/share-modal w-full max-w-[560px] rounded-t-2xl bg-[#252525] text-zinc-100 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex items-center justify-center border-b border-white/10 px-5 py-4">
          <button
            type="button"
            className="absolute left-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10"
            aria-label="Tìm bạn bè"
          >
            <IoSearchOutline className="text-[22px]" aria-hidden />
          </button>
          <h2 id="share-modal-title" className="text-lg font-semibold">
            Chia sẻ
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

        {chatRecipients.length > 0 ? (
          <div className="border-b border-white/10 px-3 py-3">
            <ShareModalScrollRow className="mt-2 px-1">
              {chatRecipients.map((row) => {
                const cid = Number(row.id);
                const selected = selectedConversationIds.includes(cid);
                const canSend = Boolean(row?.canSendMessage ?? true);
                return (
                  <ConversationRecipientChip
                    key={cid}
                    row={row}
                    selected={selected}
                    disabled={!canSend}
                    onToggle={() => {
                      if (!canSend) {
                        showToast("Cuộc trò chuyện này hiện chưa thể gửi");
                        return;
                      }
                      setSelectedConversationIds((prev) =>
                        selected ? prev.filter((id) => id !== cid) : [...prev, cid],
                      );
                    }}
                  />
                );
              })}
            </ShareModalScrollRow>
          </div>
        ) : null}

        <div className="min-h-[188px] px-3 py-5">
          {selectedConversationIds.length === 0 ? (
            <>
              {friends.length > 0 ? (
                <div className="mb-3 border-b border-white/10 pb-3">
                  <ShareModalScrollRow className="px-1">
                    {friends.map((f) => (
                      <FriendChip
                        key={f.id ?? f.username}
                        friend={f}
                        onClick={() => void copyText(watchUrl, "copy")}
                      />
                    ))}
                  </ShareModalScrollRow>
                </div>
              ) : null}
              <ShareModalScrollRow className="px-1">
                <ShareCircleButton
                  label="Sao chép"
                  bgClass="bg-[#0075DC]"
                  icon={<IoLink className="text-[30px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void copyText(watchUrl, "copy")}
                />
                <ShareCircleButton
                  label="WhatsApp"
                  bgClass="bg-[#25D366]"
                  icon={<FaWhatsapp className="text-[28px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("whatsapp")}
                />
                <ShareCircleButton
                  label="Facebook"
                  bgClass="bg-[#1877F2]"
                  icon={<FaFacebookF className="text-[26px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("facebook")}
                />
                <ShareCircleButton
                  label="Telegram"
                  bgClass="bg-[#29A9EA]"
                  icon={<FaTelegramPlane className="text-[26px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("telegram")}
                />
                <ShareCircleButton
                  label="X"
                  bgClass="bg-black ring-1 ring-zinc-600"
                  icon={<SiX className="text-[22px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("twitter")}
                />
                <ShareCircleButton
                  label="LinkedIn"
                  bgClass="bg-[#0A66C2]"
                  icon={<FaLinkedinIn className="text-[24px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("linkedin")}
                />
                <ShareCircleButton
                  label="Email"
                  bgClass="bg-[#5B9BD5]"
                  icon={<IoMailOutline className="text-[30px]" aria-hidden />}
                  disabled={busy}
                  onClick={() => void openPlatform("email")}
                />
                <ShareCircleButton
                  label="Nhúng"
                  bgClass="bg-[#20D5EC]"
                  icon={<IoCodeSlash className="text-[30px] text-black" aria-hidden />}
                  disabled={busy}
                  onClick={() => void handleEmbed()}
                />
              </ShareModalScrollRow>
            </>
          ) : (
            <div className="flex h-full min-h-[148px] flex-col">
              <input
                value={directNote}
                onChange={(e) => setDirectNote(e.target.value)}
                placeholder="Viết một tin nhắn..."
                className="h-11 w-full rounded-none border-0 bg-transparent px-0 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
              />
              <div className="mt-auto flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => void sendToSelectedChats()}
                  disabled={busy}
                  className="h-10 min-w-[56px] cursor-pointer rounded-md bg-[#fe2c55] px-3 text-sm font-semibold text-white transition hover:bg-[#db2449] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Gửi
                </button>
              </div>
            </div>
          )}
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
