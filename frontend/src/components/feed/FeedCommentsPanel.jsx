import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  IoArrowUp,
  IoChevronDown,
  IoClose,
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
import { buildProfileHref } from "../search/searchUtils.js";
import { feedCommentsPanelWidthCss } from "../../feed/feedLayout.js";
import { MOBILE_FEED_TOP_BAR_PX } from "./MobileFeedShell.jsx";
import { CommentInputAccessoryButtons } from "../comments/CommentInputAccessory.jsx";

const DEFAULT_USER_AVATAR = "/images/users/default-avatar.jpeg";
const FEED_DEFAULT_AUTHOR_AVATAR = "/images/users/default-avatar.jpeg";

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
          mentionPlacement="above"
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
  const profileHref = comment.username
    ? buildProfileHref(comment.username)
    : null;
  const displayName = comment.username ?? "Người dùng";
  const avatarSrc =
    comment.authorAvatarUrl && String(comment.authorAvatarUrl).trim()
      ? String(comment.authorAvatarUrl).trim()
      : FEED_DEFAULT_AUTHOR_AVATAR;
  const avatarClassName = `shrink-0 rounded-full object-cover bg-zinc-800 ${
    compact ? "h-6 w-6" : "h-10 w-10"
  }`;
  const nameTextClassName = `font-semibold text-zinc-100 ${
    compact ? "text-xs" : "text-[13px]"
  }`;

  return (
    <div className={`group flex gap-3 ${compact ? "py-2.5" : "py-3"}`}>
      {profileHref ? (
        <Link
          to={profileHref}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#69C9D0]"
          aria-label={`Xem trang cá nhân ${displayName}`}
        >
          <img
            src={avatarSrc}
            alt=""
            className={avatarClassName}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR;
            }}
          />
        </Link>
      ) : (
        <img
          src={avatarSrc}
          alt=""
          className={avatarClassName}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR;
          }}
        />
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {profileHref ? (
            <Link
              to={profileHref}
              className={`${nameTextClassName} hover:underline`}
            >
              {displayName}
            </Link>
          ) : (
            <span className={nameTextClassName}>{displayName}</span>
          )}
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
  /** Mobile: bottom sheet (TikTok) thay vì full-screen. */
  mobileSheet = false,
  mobileSheetHeightPx,
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

  const panel = (
    <>
      {mobileSheet ? (
        <button
          type="button"
          className="fixed inset-x-0 z-[85] cursor-default bg-black/15"
          style={{
            top: MOBILE_FEED_TOP_BAR_PX,
            bottom: mobileSheetHeightPx ?? "58vh",
          }}
          aria-label="Đóng bình luận"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`flex min-h-0 flex-col bg-[#121212] text-zinc-100 ${
          mobileSheet
            ? 'fixed inset-x-0 bottom-0 z-[90] w-full rounded-t-2xl border-t border-white/[0.08] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]'
            : `relative z-0 h-full shrink-0 border-l border-white/[0.08] pt-[4.5rem]`
        }`}
        style={
          mobileSheet
            ? {
                height: mobileSheetHeightPx
                  ? `${mobileSheetHeightPx}px`
                  : undefined,
              }
            : { width: feedCommentsPanelWidthCss() }
        }
        aria-label="Bình luận"
      >
      <div
        className={`relative z-10 flex shrink-0 flex-col border-b border-white/[0.08] ${
          mobileSheet ? 'px-4 pb-3 pt-2' : 'px-4 py-3.5'
        }`}
      >
        {mobileSheet ? (
          <div
            className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/25"
            aria-hidden
          />
        ) : null}
        <div className="flex items-center justify-between">
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
      </div>

      <div
        className={`scrollbar-none min-h-0 flex-1 overscroll-contain px-1 py-1 ${
          mobileSheet && rootComments.length === 0 && !loading && !error
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
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
          <FeedCommentsEmptyState compact={mobileSheet} />
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
              mentionPlacement="above"
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
    </>
  );

  if (mobileSheet && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }
  return panel;
}
