import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IoChatbubbleOutline,
  IoChevronBack,
  IoClose,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoImageOutline,
  IoPaperPlaneOutline,
  IoPlay,
  IoPersonOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { apiClient, uploadThumbnailToStorage, uploadToPresignedPutUrl } from "../api/client";
import { CreatorGridShell, GridLoadingState, GridLoginPrompt } from "../components/feed/CreatorGridShell.jsx";
import { useAuth } from "../state/useAuth";
import { createChatSocketClient } from "../realtime/chatSocket.js";

const PAGE_TITLE = "Tin nhắn | Vibely";
const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";
const IMAGE_MESSAGE_PREFIX = "__img__:";
const VIDEO_MESSAGE_PREFIX = "__vid__:";
const SHARED_VIDEO_ID_PREFIX = "__vshare__:";
const MAX_MEDIA_VIDEO_SECONDS = 15;

function buildPendingMediaItem(file, selectionOrder) {
  const type = String(file?.type ?? "");
  if (!type.startsWith("image/") && !type.startsWith("video/")) return null;
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    kind: type.startsWith("video/") ? "video" : "image",
    durationSeconds: 0,
    tooLong: false,
    selectionOrder,
  };
}

function readVideoDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể đọc thời lượng video."));
    };
    video.src = url;
  });
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function extractImageMessageUrl(content) {
  const value = String(content ?? "");
  if (!value.startsWith(IMAGE_MESSAGE_PREFIX)) return null;
  const url = value.slice(IMAGE_MESSAGE_PREFIX.length).trim();
  return url || null;
}

function extractVideoMessageUrl(content) {
  const value = String(content ?? "");
  if (!value.startsWith(VIDEO_MESSAGE_PREFIX)) return null;
  const payload = value.slice(VIDEO_MESSAGE_PREFIX.length).trim();
  if (!payload) return null;
  const [firstLine] = payload.split(/\r?\n/, 1);
  const url = String(firstLine ?? "").trim();
  return url || null;
}

function extractVideoMessageCaption(content) {
  const value = String(content ?? "");
  if (!value.startsWith(VIDEO_MESSAGE_PREFIX)) return "";
  const payload = value.slice(VIDEO_MESSAGE_PREFIX.length).trim();
  if (!payload) return "";
  const lines = payload.split(/\r?\n/);
  const caption = lines.slice(1).join("\n").trim();
  return caption;
}

function extractSharedVideoId(content) {
  const value = String(content ?? "");
  if (!value.startsWith(SHARED_VIDEO_ID_PREFIX)) return "";
  const payload = value.slice(SHARED_VIDEO_ID_PREFIX.length).trim();
  if (!payload) return "";
  const [firstLine] = payload.split(/\r?\n/, 1);
  return String(firstLine ?? "").trim();
}

function extractSharedVideoCaption(content) {
  const value = String(content ?? "");
  if (!value.startsWith(SHARED_VIDEO_ID_PREFIX)) return "";
  const payload = value.slice(SHARED_VIDEO_ID_PREFIX.length).trim();
  if (!payload) return "";
  const lines = payload.split(/\r?\n/);
  return lines.slice(1).join("\n").trim();
}

function toConversationPreview(content) {
  if (extractImageMessageUrl(content)) return "Đã gửi một ảnh";
  if (extractVideoMessageUrl(content)) return "Đã gửi một video";
  if (extractSharedVideoId(content)) return "Đã chia sẻ một video";
  return content || "Bắt đầu cuộc trò chuyện";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function upsertMessage(list, incoming) {
  const key = Number(incoming?.id);
  if (!Number.isFinite(key)) return list;
  const exists = list.some((m) => Number(m?.id) === key);
  if (exists) return list;
  return [...list, incoming].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function MessagesPage() {
  const { token, user, logout, authReady } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreferredConversationIdRef = useRef(Number(searchParams.get("c")));
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [composerNotice, setComposerNotice] = useState("");
  const [listMode, setListMode] = useState("normal");
  const [menuConversationId, setMenuConversationId] = useState(null);
  const [deleteTargetConversationId, setDeleteTargetConversationId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [activeVideoViewerUrl, setActiveVideoViewerUrl] = useState("");
  const [videoViewerReady, setVideoViewerReady] = useState(false);
  const [videoViewerBuffering, setVideoViewerBuffering] = useState(false);
  const [pendingMediaItems, setPendingMediaItems] = useState([]);
  const [pendingMediaNotice, setPendingMediaNotice] = useState("");
  const [sharedVideoUrlsById, setSharedVideoUrlsById] = useState({});
  const activeConversationRef = useRef(null);
  const pendingMediaItemsRef = useRef([]);
  const selectionOrderRef = useRef(1);
  const messageScrollRef = useRef(null);
  const messageBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    setComposerNotice("");
  }, [activeConversationId]);

  useEffect(() => {
    setPendingMediaItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setPendingMediaNotice("");
    setActiveVideoViewerUrl("");
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeVideoViewerUrl) {
      setVideoViewerReady(false);
      setVideoViewerBuffering(false);
      return;
    }
    setVideoViewerReady(false);
    setVideoViewerBuffering(true);
  }, [activeVideoViewerUrl]);

  useEffect(() => {
    const hasTooLongVideo = pendingMediaItems.some((item) => item.kind === "video" && item.tooLong);
    setPendingMediaNotice(hasTooLongVideo ? "Vui lòng bỏ chọn tập tin dài hơn 15 giây" : "");
  }, [pendingMediaItems]);

  useEffect(() => {
    pendingMediaItemsRef.current = pendingMediaItems;
  }, [pendingMediaItems]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        messages
          .map((msg) => extractSharedVideoId(msg?.content))
          .filter((id) => id && !sharedVideoUrlsById[id]),
      ),
    );
    if (ids.length === 0) return;
    ids.forEach((id) => {
      apiClient
        .getVideo(id, token ? { token } : {})
        .then((video) => {
          const url =
            String(video?.videoUrl ?? "").trim() ||
            String(video?.playbackUrl ?? "").trim();
          if (!url) return;
          setSharedVideoUrlsById((prev) => ({ ...prev, [id]: url }));
        })
        .catch(() => {
          /* noop */
        });
    });
  }, [messages, token, sharedVideoUrlsById]);

  useEffect(() => () => {
    pendingMediaItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  useEffect(() => {
    if (!menuConversationId) return undefined;
    const handleClickAway = () => setMenuConversationId(null);
    window.addEventListener("click", handleClickAway);
    return () => window.removeEventListener("click", handleClickAway);
  }, [menuConversationId]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const data = await apiClient.getChatConversations(token);
      const rows = Array.isArray(data?.items) ? data.items : [];
      setConversations(rows);
      setListMode("normal");
      const preferredConversationId = initialPreferredConversationIdRef.current;
      if (
        Number.isFinite(preferredConversationId) &&
        preferredConversationId > 0 &&
        rows.some((row) => Number(row.id) === preferredConversationId)
      ) {
        setActiveConversationId(preferredConversationId);
        const pref = rows.find((row) => Number(row.id) === preferredConversationId);
        setListMode(pref?.messageRequest ? "requests" : "normal");
      } else {
        setActiveConversationId(null);
      }
    } finally {
      setLoadingConversations(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authReady || !token) return;
    void loadConversations();
  }, [authReady, token, loadConversations]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!token || !conversationId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const data = await apiClient.getChatMessages(conversationId, token, { page: 0, size: 50 });
      const rows = Array.isArray(data?.items) ? data.items : [];
      setMessages(rows);
      await apiClient.markChatConversationRead(conversationId, token);
      setConversations((prev) =>
        prev.map((conv) =>
          Number(conv.id) === Number(conversationId)
            ? { ...conv, unreadCount: 0 }
            : conv,
        ),
      );
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!activeConversationId) return;
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = createChatSocketClient(token, async (event) => {
      if (event?.type !== "message.created") return;
      const incoming = event.payload;
      const conversationId = Number(incoming?.conversationId);
      if (!Number.isFinite(conversationId)) return;

      setConversations((prev) => {
        const next = prev.map((conv) => {
          if (Number(conv.id) !== conversationId) return conv;
          const shouldIncreaseUnread =
            Number(activeConversationRef.current) !== conversationId &&
            Number(incoming?.senderId) !== Number(user?.id);
          return {
            ...conv,
            lastMessage: incoming?.content ?? conv.lastMessage,
            lastMessageAt: incoming?.createdAt ?? conv.lastMessageAt,
            messageRequest:
              Number(incoming?.senderId) === Number(user?.id)
                ? false
                : Boolean(conv.messageRequest),
            canSendMessage:
              Number(incoming?.senderId) === Number(user?.id)
                ? Boolean(conv.canSendMessage ?? true)
                : conv.canSendMessage === false
                  ? true
                  : Boolean(conv.canSendMessage ?? true),
            canAcceptMessageRequest:
              Number(incoming?.senderId) === Number(user?.id)
                ? false
                : Boolean(conv.canAcceptMessageRequest),
            unreadCount: shouldIncreaseUnread
              ? Number(conv.unreadCount ?? 0) + 1
              : 0,
          };
        });
        return [...next].sort(
          (a, b) =>
            new Date(b?.lastMessageAt ?? 0).getTime() -
            new Date(a?.lastMessageAt ?? 0).getTime(),
        );
      });

      if (Number(activeConversationRef.current) === conversationId) {
        setMessages((prev) => upsertMessage(prev, incoming));
        try {
          await apiClient.markChatConversationRead(conversationId, token);
        } catch {
          /* noop */
        }
      }
    });

    socket.activate();

    return () => {
      socket.deactivate();
    };
  }, [token, user?.id]);

  const activeConversation = useMemo(
    () => conversations.find((row) => Number(row.id) === Number(activeConversationId)) ?? null,
    [conversations, activeConversationId],
  );
  const pendingMediaCount = pendingMediaItems.length;
  const pendingModalMaxWidthClass =
    pendingMediaCount <= 1
      ? "max-w-[290px]"
      : pendingMediaCount === 2
        ? "max-w-[380px]"
        : "max-w-[460px]";
  const pendingGridColsClass =
    pendingMediaCount <= 1 ? "grid-cols-1" : pendingMediaCount === 2 ? "grid-cols-2" : "grid-cols-3";
  const pendingGridJustifyClass = pendingMediaCount <= 2 ? "justify-items-start" : "";
  const pendingGridDisplayClass = pendingMediaCount <= 1 ? "inline-grid w-fit" : "grid w-full";
  const pendingPreviewWrapClass =
    pendingMediaCount <= 1
      ? "mt-1 flex w-full items-center justify-center rounded-lg border-y border-zinc-700/80 py-5"
      : "rounded-lg bg-zinc-700/60 p-2";
  const hasBlockingOverlay = Boolean(deleteTargetConversationId || pendingMediaItems.length > 0 || activeVideoViewerUrl);
  const canSendActiveMessage = Boolean(activeConversation?.canSendMessage ?? true);
  const canAcceptActiveRequest = Boolean(activeConversation?.canAcceptMessageRequest);
  const requestConversations = useMemo(
    () => conversations.filter((row) => Boolean(row?.messageRequest)),
    [conversations],
  );
  const normalConversations = useMemo(
    () =>
      conversations.filter((row) => {
        if (Boolean(row?.messageRequest)) return false;
        const hasRealMessage = Boolean(
          (typeof row?.lastMessage === "string" && row.lastMessage.trim()) ||
          row?.lastMessageAt,
        );
        return hasRealMessage;
      }),
    [conversations],
  );
  const visibleConversations = listMode === "requests" ? requestConversations : normalConversations;

  useEffect(() => {
    if (listMode === "requests" && requestConversations.length === 0) {
      setListMode("normal");
    }
  }, [listMode, requestConversations.length]);

  useEffect(() => {
    if (!hasBlockingOverlay) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [hasBlockingOverlay]);

  useEffect(() => {
    if (!activeConversationId) return;
    queueMicrotask(() => {
      messageBottomRef.current?.scrollIntoView({ block: "end" });
    });
  }, [activeConversationId, messages.length, messagesLoading]);

  const submitMessage = async (event) => {
    event.preventDefault();
    const text = String(draft ?? "").trim();
    if (!text || !token || !activeConversationId || sendBusy || imageBusy || !canSendActiveMessage) return;
    setSendBusy(true);
    setComposerNotice("");
    try {
      const sent = await apiClient.sendChatMessage(activeConversationId, text, token);
      setMessages((prev) => upsertMessage(prev, sent));
      setConversations((prev) =>
        prev
          .map((conv) =>
            Number(conv.id) === Number(activeConversationId)
              ? {
                  ...conv,
                  lastMessage: sent.content,
                  lastMessageAt: sent.createdAt,
                  unreadCount: 0,
                  messageRequest: false,
                  canAcceptMessageRequest: false,
                  canSendMessage:
                    conv.canAcceptMessageRequest || conv.messageRequest
                      ? true
                      : Number(sent.senderId) === Number(user?.id)
                        ? false
                        : Boolean(conv.canSendMessage ?? true),
                }
              : conv,
          )
          .sort(
            (a, b) =>
              new Date(b?.lastMessageAt ?? 0).getTime() -
              new Date(a?.lastMessageAt ?? 0).getTime(),
          ),
      );
      setDraft("");
    } catch (error) {
      setComposerNotice(error?.message || "Không thể gửi tin nhắn lúc này.");
    } finally {
      setSendBusy(false);
    }
  };

  const closePendingMediaComposer = () => {
    setPendingMediaItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setPendingMediaNotice("");
  };

  const removePendingMediaAt = (index) => {
    setPendingMediaItems((prev) => {
      const item = prev[index];
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handlePickImage = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || !token || !activeConversationId || sendBusy || imageBusy || !canSendActiveMessage) return;
    const picked = [];
    for (const file of files) {
      const built = buildPendingMediaItem(file, selectionOrderRef.current++);
      if (!built) continue;
      if (built.kind === "video") {
        try {
          const durationSeconds = await readVideoDurationSeconds(file);
          built.durationSeconds = durationSeconds;
          built.tooLong = durationSeconds > MAX_MEDIA_VIDEO_SECONDS;
        } catch {
          URL.revokeObjectURL(built.previewUrl);
          continue;
        }
      }
      picked.push(built);
    }
    if (picked.length === 0) {
      setComposerNotice("Vui lòng chọn file ảnh hoặc video.");
      return;
    }
    setPendingMediaItems((prev) =>
      [...prev, ...picked].sort((a, b) => Number(a.selectionOrder) - Number(b.selectionOrder)),
    );
    setComposerNotice("");
  };

  const sendPendingImage = async () => {
    if (pendingMediaItems.length === 0 || !token || !activeConversationId || sendBusy || imageBusy || !canSendActiveMessage) return;
    if (pendingMediaItems.some((item) => item.kind === "video" && item.tooLong)) {
      setPendingMediaNotice("Vui lòng bỏ chọn tập tin dài hơn 15 giây");
      return;
    }
    setImageBusy(true);
    setComposerNotice("");
    try {
      const sentMessages = [];
      const orderedToSend = [...pendingMediaItems].sort(
        (a, b) => Number(a.selectionOrder) - Number(b.selectionOrder),
      );
      for (const item of orderedToSend) {
        let messageContent;
        if (item.kind === "video") {
          const presign = await apiClient.presignVideoUpload(token, {
            contentType: item.file.type || "video/mp4",
            fileName: item.file.name || "chat-video.mp4",
          });
          await uploadToPresignedPutUrl(presign.uploadUrl, item.file, presign.contentType);
          messageContent = `${VIDEO_MESSAGE_PREFIX}${presign.playbackUrl}`;
        } else {
          const imageUrl = await uploadThumbnailToStorage(
            token,
            item.file,
            item.file.name || "chat-image.jpg",
          );
          messageContent = `${IMAGE_MESSAGE_PREFIX}${imageUrl}`;
        }
        const sent = await apiClient.sendChatMessage(activeConversationId, messageContent, token);
        sentMessages.push(sent);
      }
      setMessages((prev) => sentMessages.reduce((acc, msg) => upsertMessage(acc, msg), prev));
      setConversations((prev) =>
        prev
          .map((conv) =>
            Number(conv.id) === Number(activeConversationId)
              ? {
                  ...conv,
                  lastMessage: sentMessages.at(-1)?.content ?? conv.lastMessage,
                  lastMessageAt: sentMessages.at(-1)?.createdAt ?? conv.lastMessageAt,
                  unreadCount: 0,
                  messageRequest: false,
                  canAcceptMessageRequest: false,
                  canSendMessage:
                    conv.canAcceptMessageRequest || conv.messageRequest
                      ? true
                      : Number(sentMessages.at(-1)?.senderId) === Number(user?.id)
                        ? false
                        : Boolean(conv.canSendMessage ?? true),
                }
              : conv,
          )
          .sort(
            (a, b) =>
              new Date(b?.lastMessageAt ?? 0).getTime() -
              new Date(a?.lastMessageAt ?? 0).getTime(),
          ),
      );
      closePendingMediaComposer();
    } catch (error) {
      setComposerNotice(error?.message || "Không thể gửi tập tin lúc này.");
    } finally {
      setImageBusy(false);
    }
  };

  const acceptMessageRequest = async () => {
    if (!token || !activeConversationId || sendBusy) return;
    setSendBusy(true);
    setComposerNotice("");
    try {
      await apiClient.acceptChatMessageRequest(activeConversationId, token);
      setConversations((prev) =>
        prev.map((conv) =>
          Number(conv.id) === Number(activeConversationId)
            ? {
                ...conv,
                messageRequest: false,
                canAcceptMessageRequest: false,
                canSendMessage: true,
              }
            : conv,
        ),
      );
      if (listMode === "requests") {
        setListMode("normal");
      }
    } catch (error) {
      setComposerNotice(error?.message || "Không thể chấp nhận yêu cầu lúc này.");
    } finally {
      setSendBusy(false);
    }
  };

  const rejectMessageRequest = async (conversationId) => {
    if (!token || !conversationId || deleteBusy) return;
    const targetId = Number(conversationId);
    setDeleteBusy(true);
    setComposerNotice("");
    try {
      const targetConversation = conversations.find((conv) => Number(conv.id) === targetId);
      const targetPeerUserId = Number(targetConversation?.peerUserId);
      if (targetConversation?.canAcceptMessageRequest) {
        await apiClient.rejectChatMessageRequest(targetId, token);
      } else {
        await apiClient.deleteChatConversation(targetId, token);
      }
      setConversations((prev) =>
        prev.filter((conv) => {
          if (Number(conv.id) === targetId) return false;
          if (!targetConversation?.canAcceptMessageRequest && Number.isFinite(targetPeerUserId) && targetPeerUserId > 0) {
            return Number(conv.peerUserId) !== targetPeerUserId;
          }
          return true;
        }),
      );
      setMessages([]);
      if (Number(activeConversationId) === targetId) {
        setActiveConversationId(null);
      }
      setMenuConversationId(null);
      setDeleteTargetConversationId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("c");
        return next;
      }, { replace: true });
    } catch (error) {
      setComposerNotice(error?.message || "Không thể xóa yêu cầu lúc này.");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!token) {
    return (
      <CreatorGridShell activeMenu="messages" token={token} user={user} onLogout={logout} sidebarCollapsed contentFullBleed>
        <GridLoginPrompt
          title="Đăng nhập để dùng Tin nhắn"
          description="Kết nối và trò chuyện realtime với bạn bè trên Vibely."
        />
      </CreatorGridShell>
    );
  }

  if (!authReady) {
    return (
      <CreatorGridShell activeMenu="messages" token={token} user={user} onLogout={logout} sidebarCollapsed contentFullBleed>
        <GridLoadingState />
      </CreatorGridShell>
    );
  }

  return (
    <CreatorGridShell activeMenu="messages" token={token} user={user} onLogout={logout} sidebarCollapsed contentFullBleed>
      <div className="flex min-h-0 flex-1 overflow-hidden border border-zinc-900 bg-black">
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-zinc-900 bg-black">
          <div className="border-b border-zinc-900 px-4 py-4">
            {listMode === "requests" ? (
              <button
                type="button"
                onClick={() => {
                  setListMode("normal");
                  setActiveConversationId(null);
                }}
                className="flex cursor-pointer items-center gap-2 text-[22px] font-semibold text-zinc-100"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
                  <IoChevronBack className="h-4 w-4" aria-hidden />
                </span>
                Yêu cầu tin nhắn
              </button>
            ) : (
              <h1 className="text-[20px] font-semibold text-zinc-100">Tin nhắn</h1>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listMode !== "requests" && requestConversations.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setListMode("requests");
                  setActiveConversationId(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 border-b border-zinc-900 px-4 py-3 text-left transition hover:bg-zinc-900/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-300/60">
                  <IoChatbubbleOutline className="h-4 w-4 text-zinc-100" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">Yêu cầu tin nhắn</p>
                  <p className="truncate text-xs text-zinc-400">
                    Bạn nhận được {requestConversations.length} yêu cầu
                  </p>
                </div>
              </button>
            ) : null}
            {visibleConversations.length === 0 ? (
              listMode === "requests" ? (
                <div className="border-b border-zinc-900 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500">
                      <IoPersonOutline className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-5 text-zinc-200">Chưa có tin nhắn nào</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-b border-zinc-900 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500">
                      <IoPersonOutline className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-5 text-zinc-200">Chưa có tin nhắn nào</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              visibleConversations.map((conv) => {
                const active = Number(conv.id) === Number(activeConversationId);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`group w-full cursor-pointer border-b border-zinc-900 px-4 py-3 text-left transition ${
                      active ? "bg-zinc-900/80" : "hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <img
                        src={conv.peerAvatarUrl || DEFAULT_AVATAR}
                        alt=""
                        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="relative flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-zinc-100">
                            {conv.peerDisplayName || conv.peerUsername || "Người dùng"}
                          </p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuConversationId((prev) => (Number(prev) === Number(conv.id) ? null : conv.id));
                            }}
                            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
                            aria-label="Mở menu hội thoại"
                          >
                            <IoEllipsisHorizontal
                              className="mt-[-2px] h-5 w-5 text-zinc-200"
                              aria-hidden
                            />
                          </button>
                          {Number(menuConversationId) === Number(conv.id) ? (
                            <div
                              className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-zinc-700 bg-zinc-800/95 p-1.5 shadow-2xl shadow-black/60"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="absolute -top-2 right-3 h-0 w-0 border-b-8 border-l-8 border-r-8 border-b-zinc-700 border-l-transparent border-r-transparent" />
                              <div className="absolute top-[-7px] right-3 h-0 w-0 border-b-[7px] border-l-[7px] border-r-[7px] border-b-zinc-800 border-l-transparent border-r-transparent" />
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetConversationId(conv.id);
                                  setMenuConversationId(null);
                                }}
                                className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[15px] font-medium text-zinc-100 transition hover:bg-zinc-700"
                              >
                                Xóa
                              </button>
                              <button
                                type="button"
                                className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-[15px] font-medium text-zinc-300/80"
                                disabled
                              >
                                Báo cáo
                              </button>
                              <button
                                type="button"
                                className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-[15px] font-medium text-zinc-300/80"
                                disabled
                              >
                                Chặn
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center">
                          <div className="min-w-0 flex items-center gap-1.5">
                            <p className="truncate text-xs text-zinc-400">
                              {toConversationPreview(conv.lastMessage)}
                            </p>
                            <span className="shrink-0 text-[11px] text-zinc-500">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          </div>
                          <div className="ml-2 flex shrink-0 items-center gap-1.5">
                            {Number(conv.unreadCount ?? 0) > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                                {conv.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col bg-black">
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-zinc-500">
              <IoChatbubbleOutline className="h-16 w-16 text-zinc-800" aria-hidden />
              {listMode !== "requests" ? (
                <p>Chọn một hội thoại để bắt đầu nhắn tin.</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-900 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeConversation.peerAvatarUrl || DEFAULT_AVATAR}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {activeConversation.peerDisplayName || activeConversation.peerUsername}
                    </p>
                    {activeConversation.peerUsername ? (
                      <Link
                        to={`/@${encodeURIComponent(activeConversation.peerUsername)}`}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        @{activeConversation.peerUsername}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
              <div ref={messageScrollRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-black px-4 py-4">
                {messagesLoading ? (
                  <p className="text-sm text-zinc-500">Đang tải tin nhắn…</p>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
                    <IoChatbubbleOutline className="h-14 w-14 text-zinc-800" aria-hidden />
                    <p className="text-sm">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên.</p>
                  </div>
                ) : (
                  <div className="flex min-h-full flex-col justify-end">
                    <div className="space-y-2">
                    {messages.map((msg) => {
                      const mine = Boolean(msg.mine);
                      const imageUrl = extractImageMessageUrl(msg.content);
                      const directVideoUrl = extractVideoMessageUrl(msg.content);
                      const directVideoCaption = extractVideoMessageCaption(msg.content);
                      const sharedVideoId = extractSharedVideoId(msg.content);
                      const sharedVideoUrl = sharedVideoId ? sharedVideoUrlsById[sharedVideoId] : "";
                      const sharedVideoCaption = extractSharedVideoCaption(msg.content);
                      const videoUrl = directVideoUrl || sharedVideoUrl;
                      const videoCaption = directVideoCaption || sharedVideoCaption;
                      return (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex justify-center">
                            <span className="text-[10px] text-zinc-600">{formatTime(msg.createdAt)}</span>
                          </div>
                          <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine ? (
                              <img
                                src={activeConversation.peerAvatarUrl || DEFAULT_AVATAR}
                                alt=""
                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_AVATAR;
                                }}
                              />
                            ) : null}
                            {videoUrl || sharedVideoId ? (
                              <div className={`w-fit max-w-88 ${mine ? "ml-auto" : "mr-auto"}`}>
                                {videoUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveVideoViewerUrl(videoUrl)}
                                    className="relative block cursor-pointer overflow-hidden rounded-xl bg-black"
                                    aria-label="Mở video"
                                  >
                                    <video
                                      src={videoUrl}
                                      className="h-44 w-36 object-cover"
                                      preload="metadata"
                                      muted
                                      playsInline
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                                        <IoPlay className="ml-0.5 h-5 w-5" aria-hidden />
                                      </span>
                                    </span>
                                  </button>
                                ) : (
                                  <div className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                                    Đang tải preview video...
                                  </div>
                                )}
                                {videoCaption ? (
                                  <div
                                    className={`mt-1 w-fit max-w-88 rounded-2xl px-3 py-2 text-sm leading-5 ${
                                      mine
                                        ? "rounded-br-md bg-sky-500 text-white"
                                        : "rounded-bl-md bg-zinc-800 text-zinc-100"
                                    } ${mine ? "ml-auto" : "mr-auto"}`}
                                  >
                                    <p className="whitespace-pre-wrap wrap-break-word">{videoCaption}</p>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div
                                className={`w-fit max-w-88 rounded-2xl text-sm leading-5 ${
                                  mine
                                    ? "rounded-br-md bg-sky-500 text-white"
                                    : "rounded-bl-md bg-zinc-800 text-zinc-100"
                                } ${imageUrl ? "overflow-hidden" : "px-3 py-2"}`}
                              >
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt="Ảnh đã gửi"
                                    className="max-h-72 w-full max-w-72 rounded-xl object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                ) : (
                                  <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                                )}
                              </div>
                            )}
                            {mine ? (
                              <img
                                src={user?.avatarUrl || DEFAULT_AVATAR}
                                alt=""
                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_AVATAR;
                                }}
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    <div ref={messageBottomRef} />
                  </div>
                )}
              </div>
              {canAcceptActiveRequest ? (
                <div className="border-t border-zinc-900 bg-zinc-950">
                  <div className="border-b border-zinc-900 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-zinc-100">
                      {activeConversation.peerDisplayName || activeConversation.peerUsername} muốn gửi tin nhắn cho bạn
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Nếu bạn chấp nhận, bạn có thể trò chuyện với người dùng này. Nếu bỏ qua, người này chỉ có thể gửi 1 tin nhắn.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-10 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTargetConversationId(activeConversationId)}
                      disabled={sendBusy}
                      className="cursor-pointer text-sm text-zinc-400 transition hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      onClick={acceptMessageRequest}
                      disabled={sendBusy}
                      className="cursor-pointer text-sm font-semibold text-zinc-100 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Chấp nhận
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitMessage} className="border-t border-zinc-900 bg-black px-3 py-2.5">
                  {composerNotice ? (
                    <p className="pb-2 text-xs text-red-400">{composerNotice}</p>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handlePickImage}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        if (composerNotice) setComposerNotice("");
                      }}
                      placeholder="Nhập tin nhắn..."
                      disabled={!canSendActiveMessage}
                      className="h-10 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canSendActiveMessage || imageBusy || sendBusy}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Chèn ảnh"
                    >
                      <IoImageOutline className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={!canSendActiveMessage}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Biểu tượng cảm xúc"
                    >
                      <IoHappyOutline className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="submit"
                      disabled={sendBusy || imageBusy || !draft.trim() || !canSendActiveMessage}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#fe2c55] text-white transition hover:bg-[#c9153b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IoPaperPlaneOutline className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
      {deleteTargetConversationId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[380px] rounded-xl bg-zinc-900 p-6 shadow-2xl shadow-black/60">
            <h3 className="text-center text-[30px] font-bold text-zinc-100">Xóa tin nhắn này?</h3>
            <p className="mt-3 text-center text-sm text-zinc-400">
              Bạn sẽ không còn nhận được tin nhắn từ tài khoản này trong tương lai.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetConversationId(null)}
                disabled={deleteBusy}
                className="h-11 flex-1 cursor-pointer rounded-md bg-zinc-800 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => rejectMessageRequest(deleteTargetConversationId)}
                disabled={deleteBusy}
                className="h-11 flex-1 cursor-pointer rounded-md bg-[#fe2c55] text-sm font-semibold text-white transition hover:bg-[#da2448] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteBusy ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingMediaItems.length > 0 ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 px-4">
          <div className={`w-full ${pendingModalMaxWidthClass} rounded-xl border border-zinc-700 bg-zinc-800/95 p-3 shadow-2xl shadow-black/70`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[32px] font-bold leading-none text-zinc-100">Gửi tập tin</h3>
              <button
                type="button"
                onClick={closePendingMediaComposer}
                disabled={imageBusy}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Đóng gửi tập tin"
              >
                <IoClose className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {pendingMediaNotice ? (
              <div className="mb-2 rounded bg-[#5b3a36] px-3 py-2 text-sm font-medium text-[#ff7865]">
                {pendingMediaNotice}
              </div>
            ) : null}
            <div className={pendingPreviewWrapClass}>
              <div className={`scrollbar-none max-h-[360px] ${pendingGridDisplayClass} ${pendingGridColsClass} ${pendingGridJustifyClass} gap-2 overflow-y-auto`}>
                {[...pendingMediaItems]
                  .sort((a, b) => Number(a.selectionOrder) - Number(b.selectionOrder))
                  .map((item, index) => (
                  <div key={`${item.file.name}-${item.file.size}-${index}`} className="relative w-fit rounded-md">
                    {item.kind === "video" ? (
                      <video
                        src={item.previewUrl}
                        className="h-32 w-28 rounded-md object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt="Ảnh chờ gửi"
                        className="h-32 w-28 rounded-md object-cover"
                      />
                    )}
                    {item.kind === "video" ? (
                      <span className={`absolute bottom-1 left-1 rounded px-1 text-[11px] ${item.tooLong ? "bg-red-600/80 text-white" : "bg-black/60 text-zinc-100"}`}>
                        {formatDuration(item.durationSeconds)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removePendingMediaAt(index)}
                      disabled={imageBusy}
                      className="absolute bottom-1 right-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/55 text-zinc-100 transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Xóa tập tin đã chọn"
                    >
                      <IoTrashOutline className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageBusy}
                className="h-9 min-w-[86px] cursor-pointer rounded border border-zinc-600 bg-zinc-700/70 px-3 text-sm text-zinc-100 transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Thêm
              </button>
              <button
                type="button"
                onClick={sendPendingImage}
                disabled={imageBusy || pendingMediaItems.length === 0 || pendingMediaItems.some((item) => item.kind === "video" && item.tooLong)}
                className="h-9 min-w-[86px] cursor-pointer rounded bg-[#fe2c55] px-3 text-sm font-semibold text-white transition hover:bg-[#da2448] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {imageBusy ? "Đang gửi..." : `Gửi (${pendingMediaItems.length})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {activeVideoViewerUrl ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 px-4"
          onClick={() => setActiveVideoViewerUrl("")}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveVideoViewerUrl("")}
              className="absolute -top-11 right-0 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-zinc-900/90 text-zinc-100 transition hover:bg-zinc-800"
              aria-label="Đóng xem video"
            >
              <IoClose className="h-5 w-5" aria-hidden />
            </button>
            <div className="relative">
              {!videoViewerReady || videoViewerBuffering ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-[#070911]">
                  <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[#fe2c55] animate-spin" />
                  <p className="text-sm font-medium text-zinc-300">Đang tải...</p>
                </div>
              ) : null}
              <video
                src={activeVideoViewerUrl}
                autoPlay
                controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
                disablePictureInPicture
                className={`watch-video-el max-h-[78vh] w-full rounded-xl ${videoViewerReady && !videoViewerBuffering ? "bg-transparent opacity-100" : "bg-zinc-900 opacity-0"} transition-opacity duration-200`}
                preload="metadata"
                onLoadedData={() => {
                  setVideoViewerReady(true);
                  setVideoViewerBuffering(false);
                }}
                onCanPlay={() => {
                  setVideoViewerReady(true);
                  setVideoViewerBuffering(false);
                }}
                onPlaying={() => setVideoViewerBuffering(false)}
                onWaiting={() => setVideoViewerBuffering(true)}
                onStalled={() => setVideoViewerBuffering(true)}
                onError={() => {
                  setVideoViewerReady(true);
                  setVideoViewerBuffering(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </CreatorGridShell>
  );
}

export default MessagesPage;
