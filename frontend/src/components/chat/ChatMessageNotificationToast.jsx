import React, { useEffect, useState } from "react";
import { IoChatbubbleEllipses, IoClose } from "react-icons/io5";
import { apiClient } from "../../api/client.js";
import {
  chatMessageHasVideoPreview,
  formatChatMessagePreview,
  getChatMessageDirectVideoUrl,
  getChatMessageSharedVideoId,
} from "../../utils/chatMessagePreview.js";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";
const AUTO_DISMISS_MS = 5000;

function ChatMessageVideoPreview({ message, token }) {
  const directUrl = getChatMessageDirectVideoUrl(message);
  const sharedVideoId = getChatMessageSharedVideoId(message);
  const [sharedThumb, setSharedThumb] = useState("");

  useEffect(() => {
    if (directUrl || !sharedVideoId || !token) {
      setSharedThumb("");
      return undefined;
    }
    let cancelled = false;
    apiClient
      .getVideo(sharedVideoId, { token })
      .then((video) => {
        if (cancelled) return;
        const thumb = String(video?.thumbnailUrl ?? "").trim();
        const playback =
          String(video?.videoUrl ?? "").trim() ||
          String(video?.playbackUrl ?? "").trim();
        setSharedThumb(thumb || playback);
      })
      .catch(() => {
        if (!cancelled) setSharedThumb("");
      });
    return () => {
      cancelled = true;
    };
  }, [directUrl, sharedVideoId, token]);

  const previewUrl = directUrl || sharedThumb;
  if (!previewUrl) return null;

  return (
    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-900">
      <video
        src={previewUrl}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
    </div>
  );
}

export function ChatMessageNotificationToast({
  notification,
  token,
  onDismiss,
  onOpen,
}) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => onDismiss?.(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const message = notification.payload ?? {};
  const preview = formatChatMessagePreview(message);
  const senderName =
    message.senderDisplayName || message.senderUsername || "Người dùng";
  const avatarUrl = message.senderAvatarUrl || DEFAULT_AVATAR;
  const showVideoPreview = chatMessageHasVideoPreview(message);

  return (
    <div
      role="status"
      className="pointer-events-auto fixed bottom-20 right-4 z-120 flex w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-2xl lg:bottom-6 lg:right-6"
    >
      <button
        type="button"
        onClick={() => onOpen?.(notification)}
        className="flex min-w-0 flex-1 cursor-pointer items-stretch gap-3 px-3 py-3 text-left hover:bg-zinc-950/80"
      >
        <div className="relative shrink-0 self-center">
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#fe2c55] text-white ring-2 ring-black">
            <IoChatbubbleEllipses className="h-3 w-3" aria-hidden />
          </span>
        </div>
        <div className="min-w-0 flex-1 self-center py-0.5">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {senderName}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-300">
            đã gửi tin nhắn cho bạn: {preview}
          </p>
        </div>
        {showVideoPreview ? (
          <ChatMessageVideoPreview message={message} token={token} />
        ) : null}
      </button>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onDismiss}
        className="flex w-11 shrink-0 cursor-pointer items-center justify-center border-l border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <IoClose className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
