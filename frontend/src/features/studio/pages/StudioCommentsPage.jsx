import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { StudioCommentDateRangePicker } from "@/features/studio/components/StudioCommentDateRangePicker";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatRelativeTimeVi } from "@/shared/utils/relativeTimeVi.js";

const PAGE_SIZE = 20;
const REPLY_MAX_LEN = 150;

const STATUS_OPTIONS = [
  { id: "all", labelKey: "studio.comments.statusAll" },
  { id: "unreplied", labelKey: "studio.comments.statusUnreplied" },
  { id: "replied", labelKey: "studio.comments.statusReplied" },
];

const POSTED_BY_OPTIONS = [
  { id: "all", labelKey: "studio.comments.postedByAll" },
  { id: "followers", labelKey: "studio.comments.postedByFollowers" },
  { id: "non_followers", labelKey: "studio.comments.postedByNonFollowers" },
];

const FOLLOWER_BANDS = [
  { id: "lt5k", label: "< 5K" },
  { id: "5k10k", label: "5K – 10K" },
  { id: "10k100k", label: "10K – 100K" },
  { id: "gte100k", label: "> 100K" },
];

function toLocalIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultCommentRange() {
  const today = new Date();
  return {
    from: toLocalIso(today),
    to: toLocalIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

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
  const { t } = useTranslation();
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
        {t(current.labelKey)}
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
              {t(opt.labelKey)}
              {opt.id === value ? " ✓" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FollowerBandMenu({ value, onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(value);
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, value]);

  const toggle = (id) => {
    setDraft((current) =>
      current.includes(id)
        ? current.filter((band) => band !== id)
        : [...current, id],
    );
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
          value.length
            ? "border-zinc-500 bg-zinc-800 text-white"
            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        <IoFilterOutline className="text-sm text-zinc-400" aria-hidden />
        Số người theo dõi
        <IoChevronDown className="text-zinc-500" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="space-y-0.5 p-2">
            {FOLLOWER_BANDS.map((band) => (
              <label
                key={band.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={draft.includes(band.id)}
                  onChange={() => toggle(band.id)}
                  className="h-3.5 w-3.5 accent-[#fe2c55]"
                />
                {band.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 border-t border-zinc-800 p-2">
            <button
              type="button"
              onClick={() => setDraft([])}
              className="flex-1 cursor-pointer rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
              className="flex-1 cursor-pointer rounded-md bg-[#fe2c55] py-1.5 text-xs font-semibold text-white hover:bg-[#ff506d]"
            >
              Áp dụng
            </button>
          </div>
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
          ? t("studio.comments.emptyFiltered")
          : t("studio.comments.empty")}
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
            {t("studio.comments.followers", { count: formatCount(comment.followerCount) })}
          </span>
          {comment.repliedByCreator ? (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[11px] font-medium text-emerald-300">
              Đã trả lời
            </span>
          ) : null}
        </div>

        {comment.parentCommentId ? (
          <p className="mt-1 text-xs text-zinc-500">
            {t("studio.comments.replyTo", { username: String(comment.parentUsername ?? "user").replace(/^@/, "") })}
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
              {t("studio.comments.replies", { count: formatCount(comment.replyCount) })}
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
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("all");
  const [postedBy, setPostedBy] = useState("all");
  const [followerBands, setFollowerBands] = useState([]);
  const [dateRange, setDateRange] = useState(() => defaultCommentRange());
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
    document.title = t("studio.docTitle.comments");
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      query: search,
      postedBy,
      replyStatus: status,
      followerBands: followerBands.join(","),
      from: dateRange.from,
      to: dateRange.to,
      sort: "latest",
      size: PAGE_SIZE,
    }),
    [search, postedBy, status, followerBands, dateRange],
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
        setError(e instanceof Error ? e.message : t("studio.comments.loadFailed"));
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
      setError(e instanceof Error ? e.message : t("studio.comments.loadMoreFailed"));
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
      setError(e instanceof Error ? e.message : t("studio.comments.replyFailed"));
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
      setError(e instanceof Error ? e.message : t("studio.comments.deleteFailed"));
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
    Boolean(search) ||
    status !== "all" ||
    postedBy !== "all" ||
    followerBands.length > 0 ||
    dateRange.from !== defaultCommentRange().from ||
    dateRange.to !== defaultCommentRange().to;

  return (
    <StudioLayout active="comments" hidePageHeader hideTopBar>
      <div className="mb-3 flex items-center justify-end">
        <StudioAccountMenu />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterMenu
          label={t("studio.comments.filterReplyStatus")}
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
        <FilterMenu
          label={t("studio.comments.filterPoster")}
          options={POSTED_BY_OPTIONS}
          value={postedBy}
          onChange={setPostedBy}
        />
        <FollowerBandMenu
          value={followerBands}
          onApply={setFollowerBands}
        />
        <StudioCommentDateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          maxDate={defaultCommentRange().to}
          resetFrom={defaultCommentRange().from}
          resetTo={defaultCommentRange().to}
          onApply={setDateRange}
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
            placeholder={t("studio.comments.searchPlaceholder")}
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
            {t("studio.comments.loading")}
          </p>
        ) : items.length === 0 ? (
          <EmptyState filtered={isFiltered} />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5 text-xs text-zinc-500 sm:px-5">
              <span>{t("studio.comments.commentCount", { count: formatCount(total) })}</span>
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
                        placeholder={t("studio.comments.replyPlaceholder", { username: String(comment.username ?? "").replace(/^@/, "") })}
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
                          {replyBusy ? t("studio.comments.sending") : t("studio.comments.reply")}
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
                  {loadingMore ? t("studio.comments.loading") : t("common.seeMore")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center shadow-2xl">
            <p className="text-base font-semibold text-white">{t("studio.comments.confirmDelete")}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {t("studio.comments.confirmDeleteHint")}
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={confirmDelete}
                className="w-full cursor-pointer rounded-md bg-[#fe2c55] py-2 text-sm font-semibold text-white transition hover:bg-[#ff506d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? t("studio.comments.deleting") : t("common.delete")}
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
