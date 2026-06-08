import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  IoArrowUp,
  IoChevronDown,
  IoClose,
  IoHappyOutline,
  IoHeart,
  IoHeartOutline,
} from "react-icons/io5";
import { apiClient } from "../../api/client";
import { isVideoPublicId } from "../../utils/videoPublicId.js";
import {
  buildFeedCommentThreads,
  FEED_REPLY_PREVIEW_COUNT,
  threadRootId,
} from "../../feed/feedCommentThreads.js";
import { FeedCommentsEmptyState } from "./FeedCommentsEmptyState.jsx";
import { feedCommentsPanelWidthCss } from "../../feed/feedLayout.js";

const DEFAULT_USER_AVATAR = "/images/users/default-avatar.jpeg";
const FEED_DEFAULT_AUTHOR_AVATAR = "/images/users/default-avatar.jpeg";

const FEED_COMMENT_EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗",
  "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤",
  "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "😵", "🤯", "🤠",
  "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺",
  "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓",
  "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "👍", "👎", "👏", "🙌", "❤️",
  "🔥", "💯", "🎉", "✨", "💀", "🙏", "💪", "😈", "👀", "🤡", "💕", "💔",
];

const COMMENT_ACCESSORY_TIP_CLASSES =
  "pointer-events-none absolute bottom-full right-0 z-30 mb-2 rounded-lg bg-[#545454] px-3 py-2 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150";

const COMMENT_ACCESSORY_BTN_BASE =
  "flex shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

function findMentionAtCaret(text, caret) {
  const source = String(text ?? "");
  const pos = Math.max(0, Number(caret ?? source.length));
  const before = source.slice(0, pos);
  const match = before.match(/(?:^|\s)@([a-zA-Z0-9._]*)$/);
  if (!match) return null;
  const full = match[0];
  const query = match[1] ?? "";
  const replaceStart = pos - full.length + (/^\s/.test(full) ? 1 : 0);
  return { query, replaceStart };
}

function useAccessoryPopoverPosition(
  anchorRef,
  open,
  { width = 280, maxHeight = 240, placement = "above" } = {},
) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const panelW = width;
      const panelH = maxHeight;
      let left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
      let top;
      if (placement === "below") {
        top = rect.bottom + 8;
        if (top + panelH > window.innerHeight - 8) {
          top = Math.max(8, rect.top - panelH - 8);
        }
      } else {
        left = Math.min(rect.right - panelW, window.innerWidth - panelW - 8);
        left = Math.max(8, left);
        const spaceAbove = rect.top - 8;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        if (spaceAbove >= panelH || spaceAbove >= spaceBelow) {
          top = Math.max(8, rect.top - panelH - 8);
        } else {
          top = Math.min(rect.bottom + 8, window.innerHeight - panelH - 8);
        }
      }
      setPos({ top, left, width: panelW });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, maxHeight, open, placement, width]);

  return pos;
}

function CommentAccessoryPopover({
  anchorRef,
  open,
  popoverRef,
  width = 280,
  maxHeight = 240,
  placement = "above",
  children,
}) {
  const pos = useAccessoryPopoverPosition(anchorRef, open, {
    width,
    maxHeight,
    placement,
  });
  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#252525] shadow-2xl"
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight }}
    >
      {children}
    </div>,
    document.body,
  );
}

function CommentMentionPicker({
  token,
  open,
  filterQuery = "",
  onPick,
}) {
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchRows, setSearchRows] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (!token || !open) return;
    let cancelled = false;
    setLoadingFriends(true);
    apiClient
      .getMentionableFriends(token)
      .then((rows) => {
        if (!cancelled) setFriends(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const effectiveQuery = String(filterQuery ?? "").trim();

  useEffect(() => {
    const q = effectiveQuery;
    if (!q) {
      setSearchRows([]);
      setLoadingSearch(false);
      return;
    }
    let cancelled = false;
    setLoadingSearch(true);
    apiClient
      .getSearchUsers(q, { limit: 12 })
      .then((rows) => {
        if (!cancelled) setSearchRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setSearchRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSearch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveQuery]);

  const friendKeys = useMemo(
    () =>
      new Set(
        friends
          .map((u) => String(u?.username ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    [friends],
  );

  const suggestions = useMemo(() => {
    const q = effectiveQuery.toLowerCase();
    const source = q ? searchRows : friends;
    const seen = new Set();
    return source
      .filter((row) => {
        const username = String(row?.username ?? "").trim();
        if (!username) return false;
        const key = username.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const aKey = String(a?.username ?? "").trim().toLowerCase();
        const bKey = String(b?.username ?? "").trim().toLowerCase();
        const aFriend = friendKeys.has(aKey);
        const bFriend = friendKeys.has(bKey);
        if (aFriend !== bFriend) return aFriend ? -1 : 1;
        return aKey.localeCompare(bKey);
      });
  }, [effectiveQuery, friendKeys, friends, searchRows]);

  const loading = effectiveQuery ? loadingSearch : loadingFriends;

  return (
    <div className="flex max-h-[min(280px,50vh)] flex-col py-1">
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
        {loading ? (
          <p className="px-3 py-3 text-xs text-zinc-500">Đang tải…</p>
        ) : suggestions.length > 0 ? (
          suggestions.map((row) => {
            const username = String(row?.username ?? "").trim();
            const displayName = String(row?.displayName ?? "").trim();
            const avatarUrl = String(row?.avatarUrl ?? "").trim();
            return (
              <button
                key={row.id ?? username}
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(username);
                }}
              >
                <img
                  src={avatarUrl || FEED_DEFAULT_AUTHOR_AVATAR}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover bg-zinc-800"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR;
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {displayName || username}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    @{username}
                  </span>
                </span>
                {friendKeys.has(username.toLowerCase()) ? (
                  <span className="shrink-0 text-[10px] font-semibold text-[#69C9D0]">
                    Bạn bè
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <p className="px-3 py-3 text-xs leading-relaxed text-zinc-500">
            {effectiveQuery
              ? "Không có kết quả"
              : "Gõ tên người dùng sau @ trong ô bình luận"}
          </p>
        )}
      </div>
    </div>
  );
}

const CommentInputAccessoryButtons = forwardRef(function CommentInputAccessoryButtons(
  {
    inputRef,
    draft,
    setDraft,
    token,
    size = "md",
    className = "absolute right-1.5 top-1/2 -translate-y-1/2",
  },
  ref,
) {
  const mentionBtnRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const mentionPopoverRef = useRef(null);
  const emojiPopoverRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionReplaceStart, setMentionReplaceStart] = useState(null);

  const syncMentionFromInput = useCallback(
    (text, caret) => {
      if (!token) return;
      const mention = findMentionAtCaret(text, caret);
      if (mention) {
        setEmojiOpen(false);
        setMentionOpen(true);
        setMentionQuery(mention.query);
        setMentionReplaceStart(mention.replaceStart);
        return;
      }
      setMentionOpen(false);
      setMentionQuery("");
      setMentionReplaceStart(null);
    },
    [token],
  );

  useImperativeHandle(
    ref,
    () => ({
      syncMentionFromInput,
    }),
    [syncMentionFromInput],
  );

  const insertAtCursor = useCallback(
    (text) => {
      const el = inputRef?.current;
      if (!el || typeof setDraft !== "function") {
        setDraft?.((prev) => `${prev ?? ""}${text}`);
        return null;
      }
      const start = el.selectionStart ?? String(draft ?? "").length;
      const end = el.selectionEnd ?? String(draft ?? "").length;
      const source = String(draft ?? "");
      const next = `${source.slice(0, start)}${text}${source.slice(end)}`;
      setDraft(next);
      const caret = start + text.length;
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
      return { start, end: start + text.length, caret };
    },
    [draft, inputRef, setDraft],
  );

  const insertMentionUser = useCallback(
    (username) => {
      const clean = String(username ?? "").trim().replace(/^@/, "");
      if (!clean) return;
      const el = inputRef?.current;
      const source = String(draft ?? "");
      let start =
        mentionReplaceStart ??
        el?.selectionStart ??
        source.length;
      let end = el?.selectionStart ?? source.length;
      if (source[start] === "@") {
        const tail = source.slice(start);
        const match = tail.match(/^@[a-zA-Z0-9._]*/);
        end = start + (match?.[0]?.length ?? 1);
      }
      const next = `${source.slice(0, start)}@${clean} ${source.slice(end)}`;
      setDraft(next);
      setMentionOpen(false);
      setMentionQuery("");
      setMentionReplaceStart(null);
      const caret = start + clean.length + 2;
      queueMicrotask(() => {
        el?.focus();
        el?.setSelectionRange(caret, caret);
      });
    },
    [draft, inputRef, mentionReplaceStart, setDraft],
  );

  const openMentionPicker = useCallback(() => {
    if (!token) return;
    setEmojiOpen(false);
    const el = inputRef?.current;
    const caret = el?.selectionStart ?? String(draft ?? "").length;
    const source = String(draft ?? "");
    if (source[caret] !== "@") {
      const result = insertAtCursor("@");
      const nextText = `${source.slice(0, caret)}@${source.slice(el?.selectionEnd ?? caret)}`;
      syncMentionFromInput(nextText, result?.caret ?? caret + 1);
    } else {
      syncMentionFromInput(source, caret + 1);
    }
    queueMicrotask(() => inputRef?.current?.focus());
  }, [draft, inputRef, insertAtCursor, syncMentionFromInput, token]);

  useEffect(() => {
    if (!emojiOpen && !mentionOpen) return;
    const onDown = (e) => {
      const target = e.target;
      if (
        inputRef?.current === target ||
        inputRef?.current?.contains?.(target) ||
        mentionBtnRef.current?.contains(target) ||
        emojiBtnRef.current?.contains(target) ||
        mentionPopoverRef.current?.contains(target) ||
        emojiPopoverRef.current?.contains(target)
      ) {
        return;
      }
      setEmojiOpen(false);
      setMentionOpen(false);
      setMentionQuery("");
      setMentionReplaceStart(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen, inputRef, mentionOpen]);

  const iconClass = size === "sm" ? "text-[17px]" : "text-xl";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const atText = size === "sm" ? "text-[15px]" : "text-base";

  return (
    <>
      <div className={`flex items-center gap-0.5 ${className}`}>
        <div className="group/mention relative flex items-center">
          <button
            ref={mentionBtnRef}
            type="button"
            tabIndex={-1}
            disabled={!token}
            className={`${COMMENT_ACCESSORY_BTN_BASE} ${btnSize} font-bold leading-none ${atText} ${
              mentionOpen ? "bg-white/10 text-white" : ""
            }`}
            aria-label="Nhắc tên"
            aria-expanded={mentionOpen}
            onClick={openMentionPicker}
          >
            @
          </button>
          {!mentionOpen ? (
            <div
              role="tooltip"
              className={`${COMMENT_ACCESSORY_TIP_CLASSES} w-[min(220px,calc(100vw-2rem))] group-hover/mention:opacity-100`}
            >
              Dùng ký hiệu &quot;@&quot; để gắn thẻ một người dùng trong bình luận của
              bạn
            </div>
          ) : null}
        </div>
        <div className="group/emoji relative flex items-center">
          <button
            ref={emojiBtnRef}
            type="button"
            tabIndex={-1}
            className={`${COMMENT_ACCESSORY_BTN_BASE} ${btnSize} ${
              emojiOpen ? "bg-white/10 text-white" : ""
            }`}
            aria-label="Chèn biểu tượng cảm xúc"
            aria-expanded={emojiOpen}
            onClick={() => {
              setMentionOpen(false);
              setMentionQuery("");
              setMentionReplaceStart(null);
              setEmojiOpen((open) => !open);
            }}
          >
            <IoHappyOutline className={iconClass} aria-hidden />
          </button>
          {!emojiOpen ? (
            <div
              role="tooltip"
              className={`${COMMENT_ACCESSORY_TIP_CLASSES} whitespace-nowrap group-hover/emoji:opacity-100`}
            >
              Nhấp để thêm emoji
            </div>
          ) : null}
        </div>
      </div>

      <CommentAccessoryPopover
        anchorRef={inputRef}
        open={mentionOpen}
        popoverRef={mentionPopoverRef}
        width={300}
        maxHeight={280}
        placement="below"
      >
        <CommentMentionPicker
          token={token}
          open={mentionOpen}
          filterQuery={mentionQuery}
          onPick={insertMentionUser}
        />
      </CommentAccessoryPopover>

      <CommentAccessoryPopover
        anchorRef={emojiBtnRef}
        open={emojiOpen}
        popoverRef={emojiPopoverRef}
        width={280}
        maxHeight={220}
      >
        <div className="scrollbar-none grid max-h-[220px] grid-cols-7 gap-0.5 overflow-y-auto overscroll-contain p-2">
          {FEED_COMMENT_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-xl transition hover:bg-white/10"
              onClick={() => {
                insertAtCursor(em);
                setEmojiOpen(false);
              }}
            >
              {em}
            </button>
          ))}
        </div>
      </CommentAccessoryPopover>
    </>
  );
});

function formatCommentLikeCount(value) {
  const n = Number(value ?? 0);
  if (n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function FeedInlineReplyInput({
  compact = false,
  draft,
  setDraft,
  onSubmit,
  onCancel,
  disabled,
  inputRef,
  token,
}) {
  const accessoryRef = useRef(null);

  const handleDraftChange = useCallback((e) => {
    const { value, selectionStart } = e.target;
    setDraft(value);
    accessoryRef.current?.syncMentionFromInput(value, selectionStart);
  }, [setDraft]);

  const handleDraftKeyUp = useCallback((e) => {
    accessoryRef.current?.syncMentionFromInput(
      e.target.value,
      e.target.selectionStart,
    );
  }, []);

  return (
    <div
      className={`flex items-center gap-2 pb-3 ${compact ? "ml-9" : "ml-[52px]"}`}
    >
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder="Thêm câu trả lời..."
          disabled={disabled}
          className="w-full rounded-full border border-transparent bg-[#252525] py-2 pl-4 pr-[4.5rem] text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-600 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            void onSubmit();
          }}
          onKeyUp={handleDraftKeyUp}
        />
        <CommentInputAccessoryButtons
          ref={accessoryRef}
          inputRef={inputRef}
          draft={draft}
          setDraft={setDraft}
          token={token}
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
        />
      </div>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#fe2c55] text-white transition hover:bg-[#ff4d6d] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Gửi trả lời"
        disabled={!draft.trim() || disabled}
        onClick={() => void onSubmit()}
      >
        <IoArrowUp className="text-base" aria-hidden />
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Hủy trả lời"
        onClick={onCancel}
      >
        <IoClose className="text-xl" aria-hidden />
      </button>
    </div>
  );
}

function FeedCommentRow({
  comment,
  videoAuthorId,
  compact = false,
  onReply,
  onToggleLike,
  likeBusy,
  formatRelativeTimeVi,
}) {
  const isCreator =
    comment.userId != null &&
    videoAuthorId != null &&
    Number(comment.userId) === Number(videoAuthorId);
  const liked = Boolean(comment.likedByViewer);
  const likeLabel = formatCommentLikeCount(comment.likeCount);

  return (
    <div className={`group flex gap-3 ${compact ? "py-2.5" : "py-3"}`}>
      <img
        src={
          comment.authorAvatarUrl && String(comment.authorAvatarUrl).trim()
            ? String(comment.authorAvatarUrl).trim()
            : FEED_DEFAULT_AUTHOR_AVATAR
        }
        alt=""
        className={`shrink-0 rounded-full object-cover bg-zinc-800 ${
          compact ? "h-6 w-6" : "h-10 w-10"
        }`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR;
        }}
      />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span
            className={`font-semibold text-zinc-100 ${
              compact ? "text-xs" : "text-[13px]"
            }`}
          >
            {comment.username ?? "Người dùng"}
          </span>
          {isCreator ? (
            <>
              <span
                className={`font-semibold text-zinc-500 ${
                  compact ? "text-xs" : "text-[13px]"
                }`}
                aria-hidden
              >
                ·
              </span>
              <span
                className={`font-semibold text-[#69C9D0] ${
                  compact ? "text-xs" : "text-[13px]"
                }`}
              >
                Nhà sáng tạo
              </span>
            </>
          ) : null}
        </div>
        <p
          className={`mt-1 leading-snug text-zinc-50 ${
            compact ? "text-sm" : "text-[15px]"
          }`}
        >
          {comment.content}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-4 text-xs text-zinc-500">
            <time dateTime={comment.createdAt}>
              {formatRelativeTimeVi(comment.createdAt)}
            </time>
            <button
              type="button"
              className="cursor-pointer font-semibold text-zinc-500 transition hover:text-zinc-300"
              onClick={() => onReply?.(comment)}
            >
              Trả lời
            </button>
          </div>
          <button
            type="button"
            disabled={likeBusy}
            className={`flex shrink-0 items-center gap-1 px-1 transition disabled:opacity-50 ${
              liked ? "text-[#fe2c55]" : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-label={liked ? "Bỏ thích bình luận" : "Thích bình luận"}
            aria-pressed={liked}
            onClick={() => onToggleLike?.(comment)}
          >
            {liked ? (
              <IoHeart className="text-[18px]" aria-hidden />
            ) : (
              <IoHeartOutline className="text-[18px]" aria-hidden />
            )}
            {likeLabel ? (
              <span className="text-xs font-semibold tabular-nums leading-none">
                {likeLabel}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedCommentsPanel({
  open,
  activeVideo,
  comments,
  setComments,
  loading,
  error,
  token,
  user,
  commentDraft,
  setCommentDraft,
  commentPostError,
  setCommentPostError,
  onClose,
  onCommentCountChange,
  formatCompactCount,
  formatRelativeTimeVi,
}) {
  const inputRef = useRef(null);
  const commentAccessoryRef = useRef(null);
  const replyInputRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPostError, setReplyPostError] = useState("");
  const [expandedRoots, setExpandedRoots] = useState(() => new Set());
  const [likeBusyId, setLikeBusyId] = useState(null);

  useEffect(() => {
    setReplyingTo(null);
    setReplyDraft("");
    setReplyPostError("");
    setExpandedRoots(new Set());
  }, [activeVideo?.publicId]);

  const { rootComments, repliesByRootId } = useMemo(
    () => buildFeedCommentThreads(comments),
    [comments],
  );

  const handleCommentDraftChange = useCallback((e) => {
    const { value, selectionStart } = e.target;
    setCommentDraft(value);
    commentAccessoryRef.current?.syncMentionFromInput(value, selectionStart);
  }, [setCommentDraft]);

  const handleCommentDraftKeyUp = useCallback((e) => {
    commentAccessoryRef.current?.syncMentionFromInput(
      e.target.value,
      e.target.selectionStart,
    );
  }, []);

  const patchComment = useCallback(
    (id, patch) => {
      setComments((prev) =>
        prev.map((row) =>
          Number(row.id) === Number(id) ? { ...row, ...patch } : row,
        ),
      );
    },
    [setComments],
  );

  const handleReply = useCallback((comment) => {
    setReplyPostError("");
    setReplyDraft("");
    setReplyingTo((prev) => {
      const next = prev?.id === comment?.id ? null : comment;
      if (next) {
        queueMicrotask(() => replyInputRef.current?.focus());
      }
      return next;
    });
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyDraft("");
    setReplyPostError("");
  }, []);

  const handleToggleLike = useCallback(
    async (comment) => {
      if (!token || !isVideoPublicId(activeVideo?.publicId)) return;
      const id = comment?.id;
      if (id == null || likeBusyId != null) return;
      const liked = Boolean(comment.likedByViewer);
      const prevCount = Number(comment.likeCount ?? 0);
      setLikeBusyId(id);
      patchComment(id, {
        likedByViewer: !liked,
        likeCount: Math.max(0, prevCount + (liked ? -1 : 1)),
      });
      try {
        if (liked) {
          await apiClient.unlikeComment(activeVideo.publicId, id, token);
        } else {
          await apiClient.likeComment(activeVideo.publicId, id, token);
        }
      } catch {
        patchComment(id, {
          likedByViewer: liked,
          likeCount: prevCount,
        });
      } finally {
        setLikeBusyId(null);
      }
    },
    [activeVideo?.publicId, likeBusyId, patchComment, token],
  );

  const submitComment = useCallback(async () => {
    const text = commentDraft.trim();
    if (!text || !token || !isVideoPublicId(activeVideo?.publicId)) return;
    setCommentPostError("");
    try {
      const created = await apiClient.addComment(
        activeVideo.publicId,
        text,
        token,
        {},
      );
      setCommentDraft("");
      setComments((prev) => [
        {
          ...created,
          likeCount: Number(created?.likeCount ?? 0),
          likedByViewer: Boolean(created?.likedByViewer),
        },
        ...prev,
      ]);
      onCommentCountChange?.(1);
    } catch (e) {
      setCommentPostError(
        e instanceof Error ? e.message : "Không gửi được bình luận.",
      );
    }
  }, [
    activeVideo?.publicId,
    commentDraft,
    onCommentCountChange,
    setCommentDraft,
    setCommentPostError,
    setComments,
    token,
  ]);

  const submitReply = useCallback(async () => {
    const text = replyDraft.trim();
    const parentId = replyingTo?.id;
    if (!text || parentId == null || !token || !isVideoPublicId(activeVideo?.publicId)) {
      return;
    }
    setReplyPostError("");
    try {
      const created = await apiClient.addComment(
        activeVideo.publicId,
        text,
        token,
        { parentCommentId: parentId },
      );
      setReplyDraft("");
      const byId = new Map(comments.map((c) => [Number(c.id), c]));
      const rootId = threadRootId(replyingTo, byId);
      setReplyingTo(null);
      setComments((prev) => [
        {
          ...created,
          likeCount: Number(created?.likeCount ?? 0),
          likedByViewer: Boolean(created?.likedByViewer),
        },
        ...prev,
      ]);
      if (Number.isFinite(rootId)) {
        setExpandedRoots((prev) => {
          const next = new Set(prev);
          next.add(rootId);
          return next;
        });
      }
    } catch (e) {
      setReplyPostError(
        e instanceof Error ? e.message : "Không gửi được trả lời.",
      );
    }
  }, [
    activeVideo?.publicId,
    comments,
    replyDraft,
    replyingTo,
    setComments,
    token,
  ]);

  if (!open || !activeVideo) return null;

  const canComment = Boolean(token && isVideoPublicId(activeVideo?.publicId));
  const replyInputProps = {
    draft: replyDraft,
    setDraft: setReplyDraft,
    onSubmit: submitReply,
    onCancel: cancelReply,
    disabled: !canComment,
    inputRef: replyInputRef,
    token,
  };

  return (
    <aside
      className="relative z-0 flex h-full min-h-0 shrink-0 flex-col border-l border-white/[0.08] bg-[#121212] pt-[4.5rem] text-zinc-100"
      style={{ width: feedCommentsPanelWidthCss() }}
      aria-label="Bình luận"
    >
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
        <h2 className="min-w-0 text-[16px] font-bold tracking-tight text-white">
          Bình luận
          <span className="ml-1.5 font-semibold text-zinc-400">
            {formatCompactCount(activeVideo?.commentCount)}
          </span>
        </h2>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng bình luận"
          onClick={onClose}
        >
          <IoClose className="text-2xl" aria-hidden />
        </button>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
        {!isVideoPublicId(activeVideo?.publicId) ? (
          <p className="px-5 py-12 text-center text-sm leading-relaxed text-zinc-500">
            Bình luận chỉ khả dụng cho video trên Vibely (đã đăng nhập).
          </p>
        ) : loading ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">
            Đang tải bình luận…
          </p>
        ) : error ? (
          <p className="px-5 py-12 text-center text-sm text-red-400">{error}</p>
        ) : rootComments.length === 0 ? (
          <FeedCommentsEmptyState />
        ) : (
          <ul className="space-y-0.5">
            {rootComments.map((root) => {
              const replies = repliesByRootId.get(Number(root.id)) ?? [];
              const expanded = expandedRoots.has(Number(root.id));
              const hiddenCount = Math.max(
                0,
                replies.length - FEED_REPLY_PREVIEW_COUNT,
              );
              const visibleReplies = expanded
                ? replies
                : replies.slice(0, FEED_REPLY_PREVIEW_COUNT);
              return (
                <li
                  key={String(root.id)}
                  className="border-b border-white/[0.04] px-3 last:border-b-0"
                >
                  <FeedCommentRow
                    comment={root}
                    videoAuthorId={activeVideo?.authorId}
                    onReply={handleReply}
                    onToggleLike={handleToggleLike}
                    likeBusy={likeBusyId === root.id}
                    formatRelativeTimeVi={formatRelativeTimeVi}
                  />
                  {replyingTo?.id === root.id ? (
                    <>
                      <FeedInlineReplyInput {...replyInputProps} />
                      {replyPostError ? (
                        <p className="ml-[52px] -mt-1 pb-2 text-xs text-red-400">
                          {replyPostError}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {visibleReplies.length > 0 ? (
                    <ul className="mb-2 ml-6 border-l border-white/[0.06] pl-3">
                      {visibleReplies.map((reply) => (
                        <li key={String(reply.id)}>
                          <FeedCommentRow
                            comment={reply}
                            videoAuthorId={activeVideo?.authorId}
                            compact
                            onReply={handleReply}
                            onToggleLike={handleToggleLike}
                            likeBusy={likeBusyId === reply.id}
                            formatRelativeTimeVi={formatRelativeTimeVi}
                          />
                          {replyingTo?.id === reply.id ? (
                            <>
                              <FeedInlineReplyInput compact {...replyInputProps} />
                              {replyPostError ? (
                                <p className="ml-9 -mt-1 pb-2 text-xs text-red-400">
                                  {replyPostError}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {hiddenCount > 0 && !expanded ? (
                    <button
                      type="button"
                      className="mb-3 ml-6 flex cursor-pointer items-center gap-1 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
                      onClick={() =>
                        setExpandedRoots((prev) => {
                          const next = new Set(prev);
                          next.add(Number(root.id));
                          return next;
                        })
                      }
                    >
                      <IoChevronDown className="text-sm" aria-hidden />
                      Xem thêm {hiddenCount} phản hồi
                    </button>
                  ) : null}
                  {expanded && replies.length > FEED_REPLY_PREVIEW_COUNT ? (
                    <button
                      type="button"
                      className="mb-3 ml-6 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
                      onClick={() =>
                        setExpandedRoots((prev) => {
                          const next = new Set(prev);
                          next.delete(Number(root.id));
                          return next;
                        })
                      }
                    >
                      Ẩn bớt
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 border-t border-white/[0.08] bg-[#121212] px-4 pt-3 pb-4">
        {commentPostError ? (
          <p className="text-xs text-red-400">{commentPostError}</p>
        ) : null}
        <div className="flex items-center gap-3">
          <img
            className="h-9 w-9 shrink-0 rounded-full object-cover bg-zinc-800 ring-1 ring-white/10"
            src={
              user?.avatarUrl && String(user.avatarUrl).trim()
                ? user.avatarUrl
                : DEFAULT_USER_AVATAR
            }
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_USER_AVATAR;
            }}
          />
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              type="text"
              value={commentDraft}
              onChange={handleCommentDraftChange}
              placeholder={
                token
                  ? "Thêm bình luận..."
                  : "Đăng nhập để bình luận..."
              }
              disabled={!token || !isVideoPublicId(activeVideo?.publicId)}
              className="w-full rounded-lg border border-transparent bg-[#252525] py-2.5 pl-3.5 pr-[4.75rem] text-[15px] text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-600 disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                void submitComment();
              }}
              onKeyUp={handleCommentDraftKeyUp}
            />
            <CommentInputAccessoryButtons
              ref={commentAccessoryRef}
              inputRef={inputRef}
              draft={commentDraft}
              setDraft={setCommentDraft}
              token={token}
            />
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#fe2c55] text-white transition hover:bg-[#ff4d6d] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Gửi bình luận"
            disabled={
              !commentDraft.trim() ||
              !token ||
              !isVideoPublicId(activeVideo?.publicId)
            }
            onClick={() => void submitComment()}
          >
            <IoArrowUp className="text-lg" aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
