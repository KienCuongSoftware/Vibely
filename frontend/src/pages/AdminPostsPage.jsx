import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  IoChevronDown,
  IoClose,
  IoEyeOutline,
  IoHeartOutline,
  IoTrash,
} from "react-icons/io5";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { AdminLayout } from "../components/AdminLayout.jsx";
import { AdminPostsPageSkeleton } from "../components/admin/AdminListSkeletons.jsx";
import { AdminPagination } from "../components/admin/AdminPagination.jsx";
import { useAuth } from "../state/useAuth.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "RAW", label: "Bản nháp" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "READY", label: "Đã đăng" },
  { value: "FAILED", label: "Lỗi xử lý" },
  { value: "REPORTED", label: "Bị báo cáo" },
  { value: "HIDDEN", label: "Đã ẩn" },
  { value: "REMOVED", label: "Ẩn khỏi hồ sơ" },
];

function statusLabel(status) {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === String(status ?? "").toUpperCase(),
    )?.label ?? "Không rõ"
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactNumber(value) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function StatusBadge({ status }) {
  const value = String(status ?? "").toUpperCase();
  const palette = {
    READY: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    PROCESSING: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    FAILED: "bg-red-500/15 text-red-300 ring-red-500/30",
    REPORTED: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    HIDDEN: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    RAW: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${palette[value] ?? palette.RAW}`}
    >
      {statusLabel(value)}
    </span>
  );
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected =
    STATUS_OPTIONS.find((item) => item.value === value) ?? STATUS_OPTIONS[0];
  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label="Lọc theo trạng thái"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 min-w-48 items-center justify-between gap-3 rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm font-semibold text-zinc-100 outline-none transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 focus:border-red-500"
      >
        <span className="truncate">{selected.label}</span>
        <IoChevronDown
          className={`shrink-0 text-base transition ${open ? "rotate-180 text-red-300" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-b-2xl rounded-t-md border border-zinc-800 bg-black shadow-2xl shadow-black/70">
          {STATUS_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              className={`block w-full px-5 py-3 text-left text-sm transition ${
                item.value === value
                  ? "bg-red-500/10 font-semibold text-red-200"
                  : "text-zinc-200 hover:bg-red-500/10 hover:text-red-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DeletePostModal({ post, busy, error, onClose, onConfirm }) {
  const title = post?.description || post?.title || "Bài đăng không có mô tả";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              Xác nhận xóa bài đăng
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Bài đăng sẽ bị gỡ khỏi hệ thống và không hiển thị công khai.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="line-clamp-2 font-semibold">{title}</p>
          <p className="mt-2 text-red-200/90">
            Tác giả: @{post?.authorUsername || "unknown"} •{" "}
            {post?.authorEmail || "Không có email"}
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Đang xóa..." : "Xóa bài đăng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPostsPage() {
  const { token, user, authReady } = useAuth();
  const isAdmin = String(user?.role ?? "").toUpperCase() === "ADMIN";
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    document.title = "Vibely Admin | Quản lý bài đăng";
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setSearchTerm(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPosts = useCallback(async () => {
    if (!authReady) return;
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.getAdminPosts(token, {
        page,
        size: PAGE_SIZE,
        query: searchTerm || undefined,
        status,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
      setHasNext(Boolean(data?.hasNext));
    } catch (e) {
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setError(e.message ?? "Không tải được danh sách bài đăng.");
    } finally {
      setLoading(false);
    }
  }, [authReady, isAdmin, page, searchTerm, status, token]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const totals = useMemo(
    () => ({
      views: items.reduce((sum, item) => sum + Number(item.viewCount ?? 0), 0),
      likes: items.reduce((sum, item) => sum + Number(item.likeCount ?? 0), 0),
    }),
    [items],
  );

  const handleDelete = async () => {
    if (!deleteTarget?.publicId) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await apiClient.deleteAdminPost(token, deleteTarget.publicId);
      setDeleteTarget(null);
      if (items.length === 1 && page > 0) {
        setPage((current) => Math.max(current - 1, 0));
      } else {
        await loadPosts();
      }
    } catch (e) {
      setDeleteError(e.message ?? "Không xóa được bài đăng.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <AdminLayout
      active="posts"
      title="Quản lý bài đăng"
      subtitle="Theo dõi bài đăng của người dùng, trạng thái xử lý và thao tác gỡ bài khi cần."
    >
      {!authReady || loading ? (
        <AdminPostsPageSkeleton />
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">
            Bạn không có quyền truy cập Admin
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Tài khoản hiện tại cần vai trò Quản trị viên.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)_auto] xl:items-center">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  Tổng bài đăng: {total}
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <IoEyeOutline aria-hidden /> {compactNumber(totals.views)}{" "}
                    lượt xem
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IoHeartOutline aria-hidden /> {compactNumber(totals.likes)}{" "}
                    lượt thích
                  </span>
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                placeholder="Tìm theo mô tả, tiêu đề, tác giả hoặc email..."
              />
              <div className="flex justify-end">
                <StatusDropdown
                  value={status}
                  onChange={(nextStatus) => {
                    setPage(0);
                    setStatus(nextStatus);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-amber-400">{error}</p>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm text-zinc-200">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="py-3 pr-4 font-medium">Bài đăng</th>
                    <th className="px-3 py-3 font-medium">Tác giả</th>
                    <th className="px-3 py-3 font-medium">Trạng thái</th>
                    <th className="px-3 py-3 text-center font-medium">Xem</th>
                    <th className="px-3 py-3 text-center font-medium">Thích</th>
                    <th className="px-3 py-3 text-center font-medium">
                      Bình luận
                    </th>
                    <th className="px-3 py-3 text-center font-medium">Lưu</th>
                    <th className="px-3 py-3 font-medium">Ngày tạo</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const title =
                      item.description ||
                      item.title ||
                      "Bài đăng không có mô tả";
                    const hasThumb =
                      item.thumbnailUrl && String(item.thumbnailUrl).trim();
                    return (
                      <tr
                        key={item.publicId}
                        className="border-b border-zinc-800/80"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-800">
                              {hasThumb ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : item.videoUrl ? (
                                <video
                                  src={item.videoUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-semibold text-zinc-100">
                                {title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-500">
                                Mã #{item.publicId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-zinc-100">
                            {item.authorDisplayName || "Người dùng Vibely"}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            @{item.authorUsername || "unknown"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {compactNumber(item.viewCount)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {compactNumber(item.likeCount)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {compactNumber(item.commentCount)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {compactNumber(item.bookmarkCount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/posts/${item.publicId}`}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
                            >
                              Xem
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setDeleteTarget(item);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={`Xóa bài ${item.publicId}`}
                            >
                              <IoTrash className="text-base" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {items.length === 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-12 text-center text-sm text-zinc-500">
                Không có bài đăng phù hợp.
              </div>
            ) : null}

            <AdminPagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              hasNext={hasNext}
              onPageChange={setPage}
            />
          </section>

          {deleteTarget ? (
            <DeletePostModal
              post={deleteTarget}
              busy={deleteBusy}
              error={deleteError}
              onClose={() => {
                if (deleteBusy) return;
                setDeleteTarget(null);
                setDeleteError("");
              }}
              onConfirm={handleDelete}
            />
          ) : null}
        </>
      )}
    </AdminLayout>
  );
}
