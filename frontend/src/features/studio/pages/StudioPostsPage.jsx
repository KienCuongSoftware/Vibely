import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IoBarChartOutline,
  IoChatbubbleEllipsesOutline,
  IoChevronDown,
  IoEllipsisHorizontal,
  IoEarthOutline,
  IoInformationCircleOutline,
  IoLockClosedOutline,
  IoPeopleOutline,
  IoPencil,
  IoTrashOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { StudioLayout } from "@/features/studio/components/StudioLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { buildProfileVideoUrl } from "@/features/post/utils/videoPublicId.js";
import { formatApiDateTimeVi } from "@/shared/utils/relativeTimeVi.js";

const PRIVACY_OPTIONS = [
  {
    value: "PUBLIC",
    ui: "everyone",
    label: "Mọi người",
    Icon: IoEarthOutline,
  },
  {
    value: "FRIENDS",
    ui: "friends",
    label: "Bạn bè",
    Icon: IoPeopleOutline,
  },
  {
    value: "PRIVATE",
    ui: "onlyYou",
    label: "Chỉ mình tôi",
    Icon: IoLockClosedOutline,
  },
];

function normalizePrivacy(raw) {
  const key = String(raw || "PUBLIC").toUpperCase();
  if (key === "FRIENDS") return "FRIENDS";
  if (key === "PRIVATE") return "PRIVATE";
  return "PUBLIC";
}

function formatDurationLabel(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return null;
  const total = Math.floor(n);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Empty illustration for Posts tab — brand asset. */
function PostsEmptyIllustration() {
  return (
    <img
      src="/images/no-video.png"
      alt=""
      className="mx-auto h-28 w-auto max-w-[200px] object-contain"
      decoding="async"
    />
  );
}

/** TikTok-style document “frame” empty state for Drafts. */
function DraftsEmptyFrame() {
  return (
    <div className="relative mx-auto h-[56px] w-[168px]" aria-hidden>
      <div className="absolute top-1.5 left-1.5 h-[52px] w-[160px] rounded border border-zinc-700 bg-zinc-950" />
      <div className="absolute top-0 left-0 flex h-[52px] w-[160px] flex-col justify-center gap-1.5 rounded border border-zinc-500 bg-zinc-900 px-2.5 py-1.5 shadow-md">
        <div className="h-1 w-[68%] rounded-sm bg-zinc-500" />
        <div className="h-1 w-full rounded-sm bg-zinc-600" />
        <div className="h-1 w-[52%] rounded-sm bg-zinc-600" />
      </div>
    </div>
  );
}

function StudioListEmptyState({ variant }) {
  const isDrafts = variant === "drafts";
  return (
    <div className="mt-2 flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-16 text-center">
      {isDrafts ? <DraftsEmptyFrame /> : <PostsEmptyIllustration />}
      <p className="mt-6 text-xl font-bold text-zinc-100">
        {isDrafts ? "Chưa có bản nháp nào" : "Chưa có bài đăng nào"}
      </p>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        {isDrafts
          ? "Bản nháp của bạn sẽ xuất hiện ở đây và chỉ bạn mới nhìn thấy."
          : "Video đã đăng và video lên lịch sẽ xuất hiện ở đây."}
      </p>
      {!isDrafts ? (
        <Link
          to="/vibelystudio/upload"
          className="mt-6 inline-block cursor-pointer rounded-lg bg-[#fe2c55] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#e62a4d]"
        >
          Đăng video đầu tiên
        </Link>
      ) : null}
    </div>
  );
}

function privacyMeta(raw) {
  const value = normalizePrivacy(raw);
  return PRIVACY_OPTIONS.find((o) => o.value === value) || PRIVACY_OPTIONS[0];
}

export function StudioPostsPage() {
  const { token, authReady, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const successMessage = location.state?.successMessage;
  const listTab =
    new URLSearchParams(location.search).get("tab") === "drafts"
      ? "drafts"
      : "posts";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  /** Menu nổi (fixed + portal) tránh bị cắt bởi overflow-x-auto của khối bảng */
  const [moreMenu, setMoreMenu] = useState(null);
  const [privacyMenu, setPrivacyMenu] = useState(null);
  const [privacyBusyId, setPrivacyBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!authReady) return;
    if (!token) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.getMyUploadedVideos(token, {
        page: 0,
        size: 48,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
    } catch (e) {
      setError(e.message ?? "Không tải được danh sách bài đăng.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authReady, token]);

  useEffect(() => {
    document.title = "VibelyStudio | Bài đăng";
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Soft realtime while posts are still under AI publication hold / encoding.
  const hasPendingModeration = useMemo(
    () =>
      items.some((v) => {
        const s = String(v?.status || "").toUpperCase();
        return s === "HIDDEN" || s === "PROCESSING" || s === "RAW";
      }),
    [items],
  );

  useEffect(() => {
    if (!authReady || !token || !hasPendingModeration) return undefined;

    let cancelled = false;
    const quietRefresh = async () => {
      try {
        const data = await apiClient.getMyUploadedVideos(token, {
          page: 0,
          size: 48,
        });
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } catch {
        // keep list; retry on next tick (or ban overlay)
      }
    };

    const first = window.setTimeout(quietRefresh, 1500);
    const timer = window.setInterval(quietRefresh, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [authReady, token, hasPendingModeration]);

  useEffect(() => {
    if (!successMessage) return;
    void load();
    const t = setTimeout(() => {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [successMessage, load, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (moreMenu == null && privacyMenu == null) return undefined;
    const onPointerDown = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (
        t.closest("[data-studio-posts-more]") ||
        t.closest("[data-studio-posts-menu]") ||
        t.closest("[data-studio-privacy-trigger]") ||
        t.closest("[data-studio-privacy-menu]")
      )
        return;
      setMoreMenu(null);
      setPrivacyMenu(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMoreMenu(null);
        setPrivacyMenu(null);
      }
    };
    const onScrollOrResize = () => {
      setMoreMenu(null);
      setPrivacyMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [moreMenu, privacyMenu]);

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      await apiClient.deleteVideo(deleteTarget.publicId, token);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e.message ?? "Không xóa được bài đăng.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const publishedItems = useMemo(
    () => items.filter((v) => !v?.studioDraft),
    [items],
  );
  const draftItems = useMemo(
    () => items.filter((v) => Boolean(v?.studioDraft)),
    [items],
  );
  const visibleItems = listTab === "drafts" ? draftItems : publishedItems;

  const changePrivacy = async (video, nextPrivacy) => {
    if (!token || !video?.publicId) return;
    const current = normalizePrivacy(video.privacy);
    if (current === nextPrivacy) {
      setPrivacyMenu(null);
      return;
    }
    setPrivacyBusyId(video.publicId);
    setPrivacyMenu(null);
    setError("");
    try {
      const option = privacyMeta(nextPrivacy);
      await apiClient.updateVideo(
        video.publicId,
        {
          title: String(video.title || "Video").slice(0, 120),
          description: video.description ?? "",
          thumbnailUrl: video.thumbnailUrl || undefined,
          privacy: option.ui,
          studioDraft: Boolean(video.studioDraft),
        },
        token,
      );
      setItems((prev) =>
        prev.map((row) =>
          row.publicId === video.publicId
            ? { ...row, privacy: nextPrivacy }
            : row,
        ),
      );
    } catch (e) {
      if (e?.code === "ACCOUNT_BANNED") {
        // api client emits ban → AuthContext force logout / login ban modal
        return;
      }
      setError(e.message ?? "Không cập nhật được quyền riêng tư.");
    } finally {
      setPrivacyBusyId(null);
    }
  };

  const username = user?.username;

  return (
    <StudioLayout
      active="posts"
      title="Bài đăng"
      subtitle="Quản lý video đã đăng và bản nháp"
    >
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-5">
        {successMessage ? (
          <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {successMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mb-4 flex gap-1 border-b border-zinc-800">
          <button
            type="button"
            className={`cursor-pointer px-4 py-2.5 text-sm font-semibold transition ${
              listTab === "posts"
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => navigate("/vibelystudio/posts", { replace: true })}
          >
            Bài đăng {publishedItems.length}
          </button>
          <button
            type="button"
            className={`cursor-pointer px-4 py-2.5 text-sm font-semibold transition ${
              listTab === "drafts"
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() =>
              navigate("/vibelystudio/posts?tab=drafts", { replace: true })
            }
          >
            Bản nháp {draftItems.length}
          </button>
        </div>

        {listTab === "drafts" ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
            <IoInformationCircleOutline
              className="mt-0.5 shrink-0 text-base text-zinc-500"
              aria-hidden
            />
            <p>
              Bạn có thể lưu tối đa 30 bản nháp. Bản nháp chỉ bạn nhìn thấy và dùng được trên mọi
              thiết bị. Bản nháp hết hạn sau 60 ngày và sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
              Lượt xem
              <IoChevronDown className="text-zinc-600" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
              Lượt thích
              <IoChevronDown className="text-zinc-600" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
              Bình luận
              <IoChevronDown className="text-zinc-600" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5">
              Quyền riêng tư
              <IoChevronDown className="text-zinc-600" aria-hidden />
            </span>
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-center text-sm text-zinc-500">
            Đang tải {listTab === "drafts" ? "bản nháp" : "bài đăng"}…
          </p>
        ) : visibleItems.length === 0 ? (
          <StudioListEmptyState variant={listTab === "drafts" ? "drafts" : "posts"} />
        ) : listTab === "drafts" ? (
          <div className="mt-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm text-zinc-200">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Bản nháp</th>
                  <th className="w-[28%] whitespace-nowrap px-4 py-3 text-center font-medium">
                    Cập nhật lần cuối
                  </th>
                  <th className="w-[18%] whitespace-nowrap px-4 py-3 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((v) => {
                  const hasThumb =
                    v.thumbnailUrl && String(v.thumbnailUrl).trim();
                  const title =
                    (v.description && String(v.description).trim()) ||
                    v.title ||
                    "Video";
                  const updated = formatApiDateTimeVi(v.updatedAt || v.createdAt);
                  const duration = formatDurationLabel(v.durationSeconds);
                  return (
                    <tr key={v.publicId} className="border-b border-zinc-800/80 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-[72px] w-[52px] shrink-0 overflow-hidden rounded-md bg-zinc-800">
                            {hasThumb ? (
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : v.videoUrl ? (
                              <video
                                src={v.videoUrl}
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                                preload="metadata"
                              />
                            ) : null}
                            {duration ? (
                              <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white">
                                {duration}
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 min-w-0 font-medium text-zinc-100">
                            {title}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-zinc-400">
                        {updated}
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                            title="Chỉnh sửa bản nháp"
                            aria-label="Chỉnh sửa bản nháp"
                            onClick={() =>
                              navigate(`/vibelystudio/upload/post/${v.publicId}`)
                            }
                          >
                            <IoPencil className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-[#fe2c55] transition hover:bg-zinc-800"
                            title="Xóa bản nháp"
                            aria-label="Xóa bản nháp"
                            onClick={() => setDeleteTarget(v)}
                          >
                            <IoTrashOutline className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm text-zinc-200">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Bài đăng</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium">
                    Quyền riêng tư
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-3 text-center font-medium">
                    Thích
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-3 text-center font-medium">
                    Bình luận
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-3 text-center font-medium">
                    Ngày tạo
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-3 text-center font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((v) => {
                  const hasThumb =
                    v.thumbnailUrl && String(v.thumbnailUrl).trim();
                  const desc =
                    (v.description && String(v.description).trim()) ||
                    v.title ||
                    "Không có mô tả";
                  const created = formatApiDateTimeVi(v.createdAt);
                  const detailUrl =
                    buildProfileVideoUrl(username, v.publicId) ||
                    `/watch/${v.publicId}`;
                  const privacy = privacyMeta(v.privacy);
                  const PrivacyIcon = privacy.Icon;
                  const busyPrivacy = privacyBusyId === v.publicId;
                  return (
                    <tr
                      key={v.publicId}
                      className="border-b border-zinc-800/80 last:border-b-0"
                    >
                      <td className="max-w-xs px-4 py-3 sm:max-w-sm lg:max-w-md">
                        <div className="flex items-center gap-3">
                          <Link
                            to={detailUrl}
                            className="relative h-16 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                            title="Xem chi tiết video"
                          >
                            {hasThumb ? (
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : v.videoUrl ? (
                              <video
                                src={v.videoUrl}
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                                preload="metadata"
                              />
                            ) : null}
                          </Link>
                          <div className="min-w-0 overflow-hidden">
                            <Link
                              to={detailUrl}
                              className="line-clamp-2 cursor-pointer font-medium text-zinc-100 hover:text-white hover:underline"
                              title="Xem chi tiết video"
                            >
                              {desc}
                            </Link>
                            {String(v.status || "").toUpperCase() === "REMOVED" ? (
                              <p className="mt-0.5 text-xs font-medium text-rose-400">
                                Đã gỡ khỏi hồ sơ (vi phạm)
                              </p>
                            ) : String(v.status || "").toUpperCase() === "HIDDEN" ? (
                              <p className="mt-0.5 text-xs font-medium text-amber-400">
                                Đã ẩn / đang kiểm duyệt — chưa lên For You
                              </p>
                            ) : v.reviewRequired ? (
                              <p className="mt-0.5 text-xs font-medium text-amber-400">
                                Đang kiểm duyệt — đội ngũ Vibely đang xem xét
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <button
                          type="button"
                          data-studio-privacy-trigger
                          disabled={
                            busyPrivacy ||
                            String(v.status || "").toUpperCase() === "REMOVED"
                          }
                          className="inline-flex w-max shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
                          title="Chỉnh quyền riêng tư"
                          aria-expanded={
                            privacyMenu?.video?.publicId === v.publicId
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreMenu(null);
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setPrivacyMenu((cur) =>
                              cur?.video?.publicId === v.publicId
                                ? null
                                : {
                                    video: v,
                                    top: rect.bottom + 6,
                                    left: Math.max(8, rect.left),
                                  },
                            );
                          }}
                        >
                          <PrivacyIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="whitespace-nowrap">{privacy.label}</span>
                          <IoChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {v.likeCount ?? 0}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">
                        {v.commentCount ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center text-xs text-zinc-400">
                        {created}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Chỉnh sửa bài đăng"
                            aria-label="Chỉnh sửa bài đăng"
                            onClick={() => {
                              setMoreMenu(null);
                              navigate(
                                `/vibelystudio/upload/post/${v.publicId}`,
                              );
                            }}
                          >
                            <IoPencil className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Thống kê bài đăng"
                            aria-label="Thống kê bài đăng"
                            onClick={() => {
                              setMoreMenu(null);
                              navigate(`/vibelystudio/analytics/${v.publicId}`);
                            }}
                          >
                            <IoBarChartOutline
                              className="h-5 w-5"
                              aria-hidden
                            />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Mở bình luận"
                            aria-label="Xem bình luận"
                            onClick={() => {
                              setMoreMenu(null);
                              navigate(`/vibelystudio/comment/${v.publicId}`);
                            }}
                          >
                            <IoChatbubbleEllipsesOutline
                              className="h-5 w-5"
                              aria-hidden
                            />
                          </button>
                          <button
                            type="button"
                            data-studio-posts-more
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Thêm"
                            aria-label="Thêm thao tác"
                            aria-expanded={
                              moreMenu?.video?.publicId === v.publicId
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrivacyMenu(null);
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setMoreMenu((cur) =>
                                cur?.video?.publicId === v.publicId
                                  ? null
                                  : {
                                      video: v,
                                      top: rect.bottom + 6,
                                      right: Math.max(
                                        8,
                                        window.innerWidth - rect.right,
                                      ),
                                    },
                              );
                            }}
                          >
                            <IoEllipsisHorizontal
                              className="h-5 w-5"
                              aria-hidden
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > items.length ? (
              <p className="mt-2 text-center text-xs text-zinc-500">
                Hiển thị {items.length} / {total} bài
              </p>
            ) : null}
          </div>
        )}
      </section>

      {privacyMenu
        ? createPortal(
            <div
              data-studio-privacy-menu
              className="fixed z-[100] w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
              style={{ top: privacyMenu.top, left: privacyMenu.left }}
              role="menu"
            >
              {PRIVACY_OPTIONS.map((opt) => {
                const selected =
                  normalizePrivacy(privacyMenu.video?.privacy) === opt.value;
                const Icon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() =>
                      void changePrivacy(privacyMenu.video, opt.value)
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    <span className="flex-1">{opt.label}</span>
                    {selected ? (
                      <span className="text-[#fe2c55]" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {moreMenu
        ? createPortal(
            <div
              data-studio-posts-menu
              className="fixed z-[100] w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
              style={{ top: moreMenu.top, right: moreMenu.right }}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                onClick={() => {
                  const v = moreMenu.video;
                  setMoreMenu(null);
                  setDeleteTarget(v);
                }}
              >
                <IoTrashOutline className="h-4 w-4 shrink-0" aria-hidden />
                Xóa bài
              </button>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-100">
              {deleteTarget.studioDraft ? "Xóa bản nháp?" : "Xóa bài đăng?"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Video, ảnh bìa và file trên kho lưu trữ sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                disabled={deleteBusy}
                onClick={() => void confirmDelete()}
              >
                {deleteBusy ? "Đang xóa…" : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioLayout>
  );
}
