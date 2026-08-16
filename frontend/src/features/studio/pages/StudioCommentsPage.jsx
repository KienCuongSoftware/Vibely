import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoChatbubbleEllipsesOutline,
  IoChevronDown,
  IoFilterOutline,
  IoHeart,
  IoHeartOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoVideocamOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { StudioAccountMenu } from "@/features/studio/components/StudioAccountMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatRelativeTimeVi } from "@/shared/utils/relativeTimeVi.js";

const PAGE_SIZE = 20;
const REPLY_MAX_LEN = 150;

const STATUS_OPTIONS = [
  { id: "all", label: "Tất cả bình luận" },
  { id: "unreplied", label: "Chưa trả lời" },
];

const POSTED_BY_OPTIONS = [
  { id: "all", label: "Người đăng: tất cả" },
  { id: "others", label: "Người xem đăng" },
  { id: "me", label: "Tôi đăng" },
];

const FOLLOWER_OPTIONS = [
  { id: 0, label: "Số người theo dõi: tất cả" },
  { id: 1000, label: "Từ 1K người theo dõi" },
  { id: 10000, label: "Từ 10K người theo dõi" },
  { id: 100000, label: "Từ 100K người theo dõi" },
];

const SORT_OPTIONS = [
  { id: "latest", label: "Ngày bình luận: mới nhất" },
  { id: "oldest", label: "Ngày bình luận: cũ nhất" },
];

function formatCount(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
}

function videoLabel(comment) {
  const desc = String(comment?.videoDescription ?? "").trim();
  if (desc) return desc;
  const title = String(comment?.videoTitle ?? "").trim();
  return title || "Video";
}

function FilterMenu({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = options.find((o) => o.id === value) ?? options[0];

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
          value === options[0].id
            ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            : "border-zinc-500 bg-zinc-800 text-white"
        }`}
      >
        <IoFilterOutline className="text-sm text-zinc-400" aria-hidden />
        {current.label}
        <IoChevronDown className="text-zinc-500" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                opt.id === value
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {opt.label}
              {opt.id === value ? " ✓" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="flex w-full max-w-[220px] items-start gap-3 opacity-40">
        <span className="h-10 w-10 shrink-0 rounded-full bg-zinc-800" />
        <span className="flex-1 space-y-2 pt-1">
          <span className="block h-2.5 w-full rounded bg-zinc-800" />
          <span className="block h-2.5 w-3/4 rounded bg-zinc-800" />
        </span>
      </div>
      <p className="mt-6 text-sm text-zinc-500">
        {filtered
          ? "Không có bình luận nào khớp bộ lọc"
          : "Chưa có bình luận nào"}
      </p>
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  onDelete,
  onToggleLike,
  onOpenVideo,
  busy,
}) {
  const handle = String(comment.username ?? "user").trim().replace(/^@/, "");
  const initial = (comment.displayName || handle || "?").slice(0, 1).toUpperCase();

  return (
    <article className="flex gap-3 px-4 py-4 transition hover:bg-zinc-900/30 sm:px-5">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700/80">
        {comment.avatarUrl ? (
          <img
            src={comment.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
            {initial}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">@{handle}</span>
          {comment.fromCreator ? (
            <span className="rounded border border-[#fe2c55]/40 bg-[#fe2c55]/10 px-1.5 py-px text-[11px] font-semibold tracking-wide text-[#fe2c55] uppercase">
              Nhà sáng tạo
            </span>
          ) : null}
          <span className="text-xs text-zinc-500">
            {formatCount(comment.followerCount)} người theo dõi
          </span>
          {comment.repliedByCreator ? (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[11px] font-medium text-emerald-300">
              Đã trả lời
            </span>
          ) : null}
        </div>

        {comment.parentCommentId ? (
          <p className="mt-1 text-xs text-zinc-500">
            Trả lời @{String(comment.parentUsername ?? "user").replace(/^@/, "")}
          </p>
        ) : null}

        <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-300">
          {comment.content}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
          <time className="text-zinc-500" dateTime={comment.createdAt}>
            {formatRelativeTimeVi(comment.createdAt) || "—"}
          </time>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#fe2c55] transition hover:text-[#ff506d]"
            onClick={() => onReply(comment)}
          >
            <IoChatbubbleEllipsesOutline className="h-4 w-4 shrink-0" aria-hidden />
            Trả lời
          </button>
          <button
            type="button"
            disabled={busy}
            className={`inline-flex cursor-pointer items-center gap-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              comment.likedByViewer
                ? "text-[#fe2c55]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            onClick={() => onToggleLike(comment)}
          >
            {comment.likedByViewer ? (
              <IoHeart className="h-4 w-4" aria-hidden />
            ) : (
              <IoHeartOutline className="h-4 w-4" aria-hidden />
            )}
            <span className="tabular-nums">{formatCount(comment.likeCount)}</span>
          </button>
          {comment.replyCount > 0 ? (
            <span className="text-zinc-500">
              {formatCount(comment.replyCount)} trả lời
            </span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-1 text-zinc-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onDelete(comment)}
          >
            <IoTrashOutline className="h-4 w-4 shrink-0" aria-hidden />
            Xóa
          </button>
        </div>
      </div>

      <button
        type="button"
        title={videoLabel(comment)}
        onClick={() => onOpenVideo(comment)}
        className="relative h-16 w-11 shrink-0 cursor-pointer overflow-hidden rounded bg-zinc-800 ring-1 ring-zinc-700/60 transition hover:ring-zinc-500"
      >
        {comment.videoThumbnailUrl ? (
          <img
            src={comment.videoThumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-600">
            <IoVideocamOutline className="h-5 w-5" aria-hidden />
          </span>
        )}
      </button>
    </article>
  );
}

export function StudioCommentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("all");
  const [postedBy, setPostedBy] = useState("all");
  const [minFollowers, setMinFollowers] = useState(0);
  const [sort, setSort] = useState("latest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    document.title = "VibelyStudio | Bình luận";
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      query: search,
      postedBy,
      onlyUnreplied: status === "unreplied",
      minFollowers,
      sort,
      size: PAGE_SIZE,
    }),
    [search, postedBy, status, minFollowers, sort],
  );

  const fetchPage = useCallback(
    async (nextPage) =>
      apiClient.getStudioComments(token, { ...filters, page: nextPage }),
    [token, filters],
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await fetchPage(0);
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setPage(0);
        setHasNext(Boolean(data?.hasNext));
        setTotal(Number(data?.total ?? 0));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không tải được bình luận.");
        setItems([]);
        setHasNext(false);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, fetchPage]);

  const reload = useCallback(async () => {
    try {
      const data = await fetchPage(0);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPage(0);
      setHasNext(Boolean(data?.hasNext));
      setTotal(Number(data?.total ?? 0));
    } catch {
      /* giữ nguyên danh sách hiện tại nếu tải lại thất bại */
    }
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await fetchPage(next);
      setItems((prev) => [...prev, ...(Array.isArray(data?.items) ? data.items : [])]);
      setPage(next);
      setHasNext(Boolean(data?.hasNext));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải thêm được bình luận.");
    } finally {
      setLoadingMore(false);
    }
  };

  const openVideoComments = (comment) => {
    if (!comment?.videoPublicId) return;
    navigate(`/vibelystudio/comment/${comment.videoPublicId}`);
  };

  const submitReply = async () => {
    const text = replyDraft.trim();
    if (!replyingTo || !text || replyBusy) return;
    setReplyBusy(true);
    try {
      await apiClient.addComment(replyingTo.videoPublicId, text, token, {
        parentCommentId: replyingTo.id,
      });
      setReplyingTo(null);
      setReplyDraft("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được trả lời.");
    } finally {
      setReplyBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await apiClient.deleteComment(
        deleteTarget.videoPublicId,
        deleteTarget.id,
        token,
      );
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được bình luận.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleLike = async (comment) => {
    if (busyId) return;
    const liked = Boolean(comment.likedByViewer);
    setBusyId(comment.id);
    setItems((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              likedByViewer: !liked,
              likeCount: Math.max(0, Number(c.likeCount ?? 0) + (liked ? -1 : 1)),
            }
          : c,
      ),
    );
    try {
      if (liked) {
        await apiClient.unlikeComment(comment.videoPublicId, comment.id, token);
      } else {
        await apiClient.likeComment(comment.videoPublicId, comment.id, token);
      }
    } catch {
      setItems((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                likedByViewer: liked,
                likeCount: Math.max(0, Number(c.likeCount ?? 0) + (liked ? 1 : -1)),
              }
            : c,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const isFiltered =
    Boolean(search) || status !== "all" || postedBy !== "all" || minFollowers > 0;

  return (
    <StudioLayout active="comments" hidePageHeader hideTopBar>
      <div className="mb-3 flex items-center justify-end">
        <StudioAccountMenu />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterMenu
          label="Lọc theo trạng thái trả lời"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
        <FilterMenu
          label="Lọc theo người đăng"
          options={POSTED_BY_OPTIONS}
          value={postedBy}
          onChange={setPostedBy}
        />
        <FilterMenu
          label="Lọc theo số người theo dõi"
          options={FOLLOWER_OPTIONS}
          value={minFollowers}
          onChange={setMinFollowers}
        />
        <FilterMenu
          label="Sắp xếp theo ngày bình luận"
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
        />
        <div className="relative ml-auto w-full sm:w-72">
          <IoSearchOutline
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm bình luận hoặc tên người dùng"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pr-3 pl-9 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        {loading ? (
          <p className="px-4 py-24 text-center text-sm text-zinc-500">
            Đang tải bình luận…
          </p>
        ) : items.length === 0 ? (
          <EmptyState filtered={isFiltered} />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5 text-xs text-zinc-500 sm:px-5">
              <span>{formatCount(total)} bình luận</span>
            </div>
            <div className="divide-y divide-zinc-800/70">
              {items.map((comment) => (
                <div key={comment.id}>
                  <CommentRow
                    comment={comment}
                    busy={busyId === comment.id}
                    onReply={(c) => {
                      setReplyingTo(c);
                      setReplyDraft("");
                    }}
                    onDelete={setDeleteTarget}
                    onToggleLike={toggleLike}
                    onOpenVideo={openVideoComments}
                  />
                  {replyingTo?.id === comment.id ? (
                    <div className="px-4 pb-4 pl-[68px] sm:px-5 sm:pl-[72px]">
                      <textarea
                        value={replyDraft}
                        maxLength={REPLY_MAX_LEN}
                        rows={2}
                        autoFocus
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={`Trả lời @${String(comment.username ?? "").replace(/^@/, "")}`}
                        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <span className="mr-auto text-[11px] text-zinc-600">
                          {replyDraft.length}/{REPLY_MAX_LEN}
                        </span>
                        <button
                          type="button"
                          className="cursor-pointer rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyDraft("");
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={!replyDraft.trim() || replyBusy}
                          className="cursor-pointer rounded-md bg-[#fe2c55] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#ff506d] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={submitReply}
                        >
                          {replyBusy ? "Đang gửi…" : "Trả lời"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {hasNext ? (
              <div className="border-t border-zinc-800/80 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Đang tải…" : "Tải thêm"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center shadow-2xl">
            <p className="text-base font-semibold text-white">Xóa bình luận?</p>
            <p className="mt-2 text-sm text-zinc-400">
              Bình luận và các trả lời của nó sẽ bị xóa vĩnh viễn.
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={confirmDelete}
                className="w-full cursor-pointer rounded-md bg-[#fe2c55] py-2 text-sm font-semibold text-white transition hover:bg-[#ff506d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? "Đang xóa…" : "Xóa"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-full cursor-pointer rounded-md border border-zinc-700 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioLayout>
  );
}
