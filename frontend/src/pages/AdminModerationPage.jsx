import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IoClose,
  IoHandLeftOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import { apiClient } from "../api/client.js";
import { AdminLayout } from "../components/AdminLayout.jsx";
import { AdminPagination } from "../components/admin/AdminPagination.jsx";
import { useAuth } from "../state/useAuth.js";

const PAGE_SIZE = 20;

const STATE_FILTERS = [
  { value: "", label: "Đang chờ / đang xử lý" },
  { value: "OPEN", label: "Chờ nhận" },
  { value: "CLAIMED", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã xong" },
];

const QUEUE_SOURCE_TABS = [
  { value: "ai", label: "Hàng đợi AI" },
  { value: "user", label: "Báo cáo người dùng" },
];

const QUEUE_REASON_LABEL = {
  USER_REPORT: "Báo cáo người dùng",
  AI_REVIEW: "AI cần xem lại",
  AI_BLOCK_HOLD: "AI chặn — chờ duyệt",
};

const DECISION_OPTIONS = [
  {
    value: "ALLOW",
    label: "Cho phép",
    effect: "Công khai bình thường, lên Khám phá / Dành cho bạn",
  },
  {
    value: "LIMIT",
    label: "Hạn chế",
    effect: "Vẫn công khai, nhưng bỏ khỏi Khám phá / Dành cho bạn",
  },
  {
    value: "REVIEW",
    label: "Giữ công khai",
    effect: "Giữ bài công khai như hiện tại (không ẩn / không gỡ)",
  },
  {
    value: "BLOCK",
    label: "Chặn",
    effect:
      "Ẩn khỏi hồ sơ & URL công khai; giữ file để admin xem lại (không xóa S3)",
  },
  {
    value: "DELETE",
    label: "Xóa",
    effect:
      "Ẩn khỏi hồ sơ & URL công khai; giữ file để admin xem lại (không xóa S3)",
  },
];

const DECISION_LABEL = {
  ALLOW: "Cho phép",
  LIMIT: "Hạn chế",
  REVIEW: "Cần xem lại",
  BLOCK: "Chặn",
  DELETE: "Xóa",
};

const DECISION_BADGE = {
  ALLOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  LIMIT: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  REVIEW: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  BLOCK: "border-red-500/40 bg-red-500/10 text-red-300",
  DELETE: "border-red-600/50 bg-red-600/15 text-red-200",
};

const QUEUE_STATE_LABEL = {
  OPEN: "Chờ nhận",
  CLAIMED: "Đang xử lý",
  RESOLVED: "Đã xong",
  DISMISSED: "Đã bỏ",
};

const VIDEO_STATUS_LABEL = {
  RAW: "Bản nháp",
  PROCESSING: "Đang xử lý",
  READY: "Đã đăng",
  FAILED: "Lỗi xử lý",
  REPORTED: "Bị báo cáo",
  HIDDEN: "Đã ẩn",
  REMOVED: "Đã ẩn khỏi hồ sơ",
};

const MODALITY_LABEL = {
  OCR: "Chữ trên ảnh",
  SPEECH: "Lời thoại",
  TAG: "Nhãn ngữ nghĩa",
  OBJECT: "Đối tượng",
  SCENE: "Cảnh",
  ORIGINALITY: "Độ gốc",
  METADATA: "Siêu dữ liệu",
  USER_REPORT: "Báo cáo người dùng",
  PLUGIN: "Plugin",
  RULE: "Luật",
};

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

/** Matches backend policy: allow≤24, limit≤49, review≤74, else block. */
function riskLevelFromScore(risk) {
  const n = Number(risk);
  if (!Number.isFinite(n)) {
    return {
      label: "—",
      className: "border-zinc-700 text-zinc-400",
    };
  }
  if (n <= 24) {
    return {
      label: "Thấp",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    };
  }
  if (n <= 49) {
    return {
      label: "Trung bình",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    };
  }
  if (n <= 74) {
    return {
      label: "Cao",
      className: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    };
  }
  return {
    label: "Nghiêm trọng",
    className: "border-red-500/40 bg-red-500/10 text-red-300",
  };
}

function confidenceLabel(confidence) {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return null;
  if (n < 0.45) return "AI chưa chắc";
  if (n < 0.7) return "AI khá chắc";
  return "AI chắc chắn";
}

function RiskLevelBadge({ risk, confidence, compact = false }) {
  const level = riskLevelFromScore(risk);
  const conf = confidenceLabel(confidence);
  const title =
    risk != null
      ? `Điểm rủi ro ${risk}${
          confidence != null
            ? ` · độ tin cậy ${Number(confidence).toFixed(2)}`
            : ""
        }`
      : undefined;
  return (
    <span className="inline-flex flex-col gap-0.5" title={title}>
      <span
        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${level.className}`}
      >
        {level.label}
      </span>
      {!compact && conf ? (
        <span className="text-[10px] text-zinc-500">{conf}</span>
      ) : null}
    </span>
  );
}

function DecisionBadge({ decision }) {
  const key = String(decision ?? "").toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        DECISION_BADGE[key] ?? "border-zinc-700 text-zinc-300"
      }`}
    >
      {DECISION_LABEL[key] ?? (key || "—")}
    </span>
  );
}

function ResolvePanel({
  detail,
  queueId,
  submitting,
  error,
  onClose,
  onResolve,
  onClaim,
}) {
  const report = detail?.report || {};
  const [decision, setDecision] = useState(report.decision || "ALLOW");
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    setDecision(report.decision || "ALLOW");
    setReasonText("");
  }, [report.decision, detail?.videoPublicId]);

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-sm text-zinc-300">
          Đang tải chi tiết…
        </p>
      </div>
    );
  }

  const evidence = Array.isArray(detail.evidence) ? detail.evidence : [];
  const tags = Array.isArray(detail.semanticTags) ? detail.semanticTags : [];
  const mediaUrl = detail.videoUrl || detail.thumbnailUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4 sm:py-6">
      <div className="scrollbar-none flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-zinc-100">
                {detail.title || "Video không tiêu đề"}
              </h2>
              <DecisionBadge decision={report.decision} />
              {report.status === "SHADOW" ? (
                <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  AI chỉ ghi nhận (chưa áp dụng)
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              @{detail.authorUsername || "—"} · rủi ro{" "}
              <span className="align-middle">
                <RiskLevelBadge
                  risk={report.risk}
                  confidence={report.confidence}
                />
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-none grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
              {mediaUrl ? (
                <video
                  key={mediaUrl}
                  src={detail.videoUrl || undefined}
                  poster={detail.thumbnailUrl || undefined}
                  controls
                  playsInline
                  className="aspect-[9/16] max-h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-[9/16] max-h-[420px] items-center justify-center text-sm text-zinc-500">
                  Không có video
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Trạng thái video:{" "}
              <span className="text-zinc-300">
                {VIDEO_STATUS_LABEL[
                  String(detail.status || "").toUpperCase()
                ] ??
                  detail.status ??
                  "—"}
              </span>
              {detail.queueState ? (
                <>
                  {" "}
                  · Hàng đợi:{" "}
                  <span className="text-zinc-300">
                    {QUEUE_STATE_LABEL[detail.queueState] ?? detail.queueState}
                  </span>
                </>
              ) : null}
            </p>
            {detail.videoPublicId ? (
              <Link
                to={`/admin/posts/${detail.videoPublicId}`}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Mở trang quản lý bài đăng →
              </Link>
            ) : null}
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bằng chứng ({evidence.length})
              </h3>
              <ul className="mt-2 space-y-2 text-sm">
                {evidence.length === 0 ? (
                  <li className="text-zinc-500">Không có bằng chứng</li>
                ) : (
                  evidence.map((item, idx) => (
                    <li
                      key={`${item.reasonCode}-${idx}`}
                      className="rounded-lg border border-zinc-800/80 bg-black/40 px-2.5 py-2"
                    >
                      <p className="font-semibold text-zinc-200">
                        {item.reasonCode}{" "}
                        <span className="font-normal text-zinc-500">
                          ·{" "}
                          {MODALITY_LABEL[
                            String(item.sourceModality || "").toUpperCase()
                          ] ?? item.sourceModality}
                        </span>
                      </p>
                      {item.snippet ? (
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-400">
                          {item.snippet}
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nhãn ngữ nghĩa
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <span className="text-xs text-zinc-500">—</span>
                ) : (
                  tags.slice(0, 16).map((tag) => (
                    <span
                      key={tag.slug}
                      className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      {tag.slug}{" "}
                      <span className="text-zinc-500">
                        {Number(tag.confidence ?? 0).toFixed(2)}
                      </span>
                    </span>
                  ))
                )}
              </div>
              {detail.originality?.decision ? (
                <p className="mt-2 text-xs text-zinc-400">
                  Độ gốc:{" "}
                  <span className="text-zinc-200">
                    {DECISION_LABEL[
                      String(detail.originality.decision).toUpperCase()
                    ] ?? detail.originality.decision}
                  </span>
                  {detail.originality.overallConfidence != null
                    ? ` · độ tin cậy ${Number(detail.originality.overallConfidence).toFixed(2)}`
                    : null}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Quyết định kiểm duyệt viên
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Chọn một quyết định — hệ thống áp dụng ngay khi xác nhận (kể cả
                khi AI đang ở chế độ ghi nhận).
              </p>
              <fieldset className="mt-3 space-y-2" disabled={submitting}>
                <legend className="sr-only">Quyết định</legend>
                {DECISION_OPTIONS.map((opt) => {
                  const selected = decision === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition ${
                        selected
                          ? "border-rose-500/50 bg-rose-500/10"
                          : "border-zinc-800 bg-black/40 hover:border-zinc-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="moderation-decision"
                        value={opt.value}
                        checked={selected}
                        onChange={() => setDecision(opt.value)}
                        className="mt-1 accent-rose-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-zinc-100">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                          {opt.effect}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <label className="mt-3 block text-xs text-zinc-400">
                Lý do (bắt buộc nếu khác quyết định AI)
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Ví dụ: Xác nhận AI / nhãn spam sai / nội dung nguy hiểm…"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              {error ? (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {queueId && detail.queueState === "OPEN" ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onClaim(queueId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    <IoHandLeftOutline aria-hidden />
                    Nhận xử lý
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={submitting || !queueId}
                  onClick={() =>
                    onResolve(queueId, {
                      decision,
                      reasonCode:
                        String(decision).toUpperCase() ===
                        String(report.decision || "").toUpperCase()
                          ? "CONFIRM_AI"
                          : "HUMAN_OVERRIDE",
                      reasonText: reasonText.trim() || undefined,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  <IoShieldCheckmarkOutline aria-hidden />
                  {submitting ? "Đang lưu…" : "Xác nhận & áp dụng"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const APPEAL_STATE_FILTERS = [
  { value: "", label: "Đang chờ" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "IN_REVIEW", label: "Đang xem" },
  { value: "RESTORED", label: "Khôi phục" },
  { value: "SOFTENED", label: "Nới lỏng" },
  { value: "UPHELD", label: "Giữ nguyên" },
  { value: "REJECTED", label: "Từ chối" },
];

export function AdminModerationPage() {
  const { token, user, authReady } = useAuth();
  const isAdmin = String(user?.role ?? "").toUpperCase() === "ADMIN";
  const [tab, setTab] = useState("ai");
  const [page, setPage] = useState(0);
  const [stateFilter, setStateFilter] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPublicId, setSelectedPublicId] = useState(null);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appeals, setAppeals] = useState([]);
  const [appealTotal, setAppealTotal] = useState(0);
  const [appealHasNext, setAppealHasNext] = useState(false);
  const [appealPage, setAppealPage] = useState(0);
  const [appealStateFilter, setAppealStateFilter] = useState("");
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [appealDecision, setAppealDecision] = useState("ALLOW");
  const [appealOutcome, setAppealOutcome] = useState("RESTORED");
  const [appealNotes, setAppealNotes] = useState("");
  const [appealError, setAppealError] = useState("");

  useEffect(() => {
    document.title = "Vibely Admin | Kiểm duyệt nội dung";
  }, []);

  const loadQueue = useCallback(async () => {
    if (!authReady) return;
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    if (tab !== "ai" && tab !== "user") return;
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.getAdminModerationQueue(token, {
        page,
        size: PAGE_SIZE,
        state: stateFilter || undefined,
        source: tab,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
      setHasNext(Boolean(data?.hasNext));
    } catch (e) {
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setError(e.message ?? "Không tải được hàng đợi kiểm duyệt.");
    } finally {
      setLoading(false);
    }
  }, [authReady, isAdmin, page, stateFilter, tab, token]);

  const loadAppeals = useCallback(async () => {
    if (!authReady || !token || !isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.getAdminModerationAppeals(token, {
        page: appealPage,
        size: PAGE_SIZE,
        state: appealStateFilter || undefined,
      });
      setAppeals(Array.isArray(data?.items) ? data.items : []);
      setAppealTotal(Number(data?.total ?? 0));
      setAppealHasNext(Boolean(data?.hasNext));
    } catch (e) {
      setAppeals([]);
      setAppealTotal(0);
      setAppealHasNext(false);
      setError(e.message ?? "Không tải được khiếu nại.");
    } finally {
      setLoading(false);
    }
  }, [appealPage, appealStateFilter, authReady, isAdmin, token]);

  useEffect(() => {
    if (tab === "ai" || tab === "user") void loadQueue();
    else void loadAppeals();
  }, [tab, loadQueue, loadAppeals]);

  useEffect(() => {
    setPage(0);
  }, [stateFilter, tab]);

  useEffect(() => {
    setAppealPage(0);
  }, [appealStateFilter]);
  const openDetail = async (item) => {
    if (!item?.videoPublicId) return;
    setSelectedPublicId(item.videoPublicId);
    setSelectedQueueId(item.queueId);
    setModalError("");
    setDetail(null);
    try {
      const data = await apiClient.getAdminModerationVideo(
        token,
        item.videoPublicId,
      );
      setDetail(data);
      if (data?.queueId) setSelectedQueueId(data.queueId);
    } catch (e) {
      setModalError(e.message ?? "Không tải được chi tiết.");
    }
  };

  const closeModal = (force = false) => {
    if (submitting && !force) return;
    setSelectedPublicId(null);
    setSelectedQueueId(null);
    setDetail(null);
    setModalError("");
  };

  const handleClaim = async (queueId) => {
    setSubmitting(true);
    setModalError("");
    try {
      await apiClient.claimAdminModerationQueue(token, queueId);
      if (selectedPublicId) {
        const data = await apiClient.getAdminModerationVideo(
          token,
          selectedPublicId,
        );
        setDetail(data);
      }
      await loadQueue();
    } catch (e) {
      setModalError(e.message ?? "Không nhận được mục xử lý.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (queueId, payload) => {
    if (!queueId) {
      setModalError(
        "Thiếu mục hàng đợi — video chưa có yêu cầu xem lại đang mở.",
      );
      return;
    }
    if (
      String(payload.decision).toUpperCase() !==
        String(detail?.report?.decision || "").toUpperCase() &&
      !payload.reasonText
    ) {
      setModalError("Hãy ghi lý do khi chọn khác quyết định của AI.");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      await apiClient.resolveAdminModerationQueue(token, queueId, payload);
      await loadQueue();
      setSubmitting(false);
      closeModal(true);
    } catch (e) {
      setModalError(e.message ?? "Không lưu được quyết định.");
      setSubmitting(false);
    }
  };

  const emptyHint = useMemo(() => {
    if (stateFilter) return "Không có mục với bộ lọc này.";
    if (tab === "user") {
      return "Chưa có báo cáo từ người dùng. Khi ai đó báo cáo video, mục sẽ xuất hiện tại đây.";
    }
    return "Hàng đợi AI trống. Video AI đánh dấu cần xem lại sẽ xuất hiện tại đây.";
  }, [stateFilter, tab]);

  return (
    <AdminLayout
      active="moderation"
      title="Kiểm duyệt nội dung"
      subtitle="Hàng đợi xem lại, khiếu nại người sáng tạo, điểm tin cậy."
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          Đang tải…
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">
            Bạn không có quyền truy cập Admin
          </p>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {QUEUE_SOURCE_TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                  tab === item.value
                    ? "border-red-500 bg-red-500/10 text-red-200"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTab("appeals")}
              className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                tab === "appeals"
                  ? "border-red-500 bg-red-500/10 text-red-200"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Khiếu nại người sáng tạo
            </button>
          </div>

          {tab === "appeals" ? (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  Tổng khiếu nại: {appealTotal}
                </p>
                <div className="flex flex-wrap gap-2">
                  {APPEAL_STATE_FILTERS.map((item) => {
                    const active = appealStateFilter === item.value;
                    return (
                      <button
                        key={item.value || "pending"}
                        type="button"
                        onClick={() => setAppealStateFilter(item.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? "border-red-500 bg-red-500/10 text-red-200"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error ? (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              ) : null}
              {appeals.length === 0 ? (
                <p className="mt-6 text-center text-sm text-zinc-500">
                  Chưa có khiếu nại.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {appeals.map((a) => (
                    <li
                      key={a.appealId}
                      className="rounded-xl border border-zinc-800 bg-black/30 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100">
                            {a.title || "Không tiêu đề"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            @{a.authorUsername} · từ{" "}
                            {DECISION_LABEL[a.fromDecision] ?? a.fromDecision}
                          </p>
                          <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                            {a.appealText}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppeal(a);
                            setAppealOutcome("RESTORED");
                            setAppealDecision("ALLOW");
                            setAppealNotes("");
                            setAppealError("");
                          }}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                        >
                          Xử lý
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <AdminPagination
                page={appealPage}
                total={appealTotal}
                pageSize={PAGE_SIZE}
                hasNext={appealHasNext}
                onPageChange={setAppealPage}
              />
            </section>
          ) : null}

          {tab === "ai" || tab === "user" ? (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  {tab === "user" ? "Báo cáo người dùng" : "Hàng đợi AI"}: {total}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATE_FILTERS.map((item) => {
                    const active = stateFilter === item.value;
                    return (
                      <button
                        key={item.value || "open"}
                        type="button"
                        onClick={() => setStateFilter(item.value)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-red-500 bg-red-500/10 text-red-200"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              ) : items.length === 0 ? (
                <p className="mt-6 text-center text-sm text-zinc-500">
                  {emptyHint}
                </p>
              ) : (
                <div className="mt-4 w-full min-w-0">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="w-[34%] px-2 py-2 font-semibold">
                          Video
                        </th>
                        <th className="w-[14%] px-2 py-2 font-semibold">
                          {tab === "user" ? "Nguồn" : "AI"}
                        </th>
                        <th className="hidden w-[14%] px-2 py-2 font-semibold sm:table-cell">
                          Rủi ro
                        </th>
                        <th className="hidden w-[14%] px-2 py-2 font-semibold md:table-cell">
                          Hàng đợi
                        </th>
                        <th className="hidden w-[12%] px-2 py-2 font-semibold lg:table-cell">
                          Tạo lúc
                        </th>
                        <th className="w-[10%] px-2 py-2 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.queueId}
                          className="border-b border-zinc-800/70"
                        >
                          <td className="px-2 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt=""
                                  className="h-12 w-9 shrink-0 rounded object-cover"
                                />
                              ) : (
                                <div className="h-12 w-9 shrink-0 rounded bg-zinc-800" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-100">
                                  {item.title || "Không tiêu đề"}
                                </p>
                                <p className="truncate text-xs text-zinc-500">
                                  @{item.authorUsername}
                                  {item.reportShadow
                                    ? " · AI chỉ ghi nhận"
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            {tab === "user" ? (
                              <span className="inline-flex rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
                                {QUEUE_REASON_LABEL[item.reason] ||
                                  item.reason ||
                                  "Báo cáo"}
                              </span>
                            ) : (
                              <DecisionBadge decision={item.aiDecision} />
                            )}
                          </td>
                          <td className="hidden px-2 py-3 sm:table-cell">
                            <RiskLevelBadge
                              risk={item.risk}
                              confidence={item.confidence}
                              compact
                            />
                          </td>
                          <td className="hidden px-2 py-3 text-zinc-300 md:table-cell">
                            {QUEUE_STATE_LABEL[item.queueState] ??
                              item.queueState}
                            {item.claimedBy ? (
                              <span className="block truncate text-[11px] text-zinc-500">
                                {item.claimedBy}
                              </span>
                            ) : null}
                          </td>
                          <td className="hidden px-2 py-3 text-xs text-zinc-500 lg:table-cell">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void openDetail(item)}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
                            >
                              Xử lý
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <AdminPagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                hasNext={hasNext}
                onPageChange={setPage}
              />
            </section>
          ) : null}

          {selectedPublicId ? (
            <ResolvePanel
              detail={detail}
              queueId={selectedQueueId}
              submitting={submitting}
              error={modalError}
              onClose={closeModal}
              onClaim={handleClaim}
              onResolve={handleResolve}
            />
          ) : null}

          {selectedAppeal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <h3 className="text-lg font-bold text-zinc-100">
                  Xử lý khiếu nại #{selectedAppeal.appealId}
                </h3>
                <p className="mt-2 text-sm text-zinc-400 whitespace-pre-wrap">
                  {selectedAppeal.appealText}
                </p>
                <label className="mt-4 block text-xs text-zinc-400">
                  Kết quả
                  <select
                    value={appealOutcome}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAppealOutcome(v);
                      if (v === "RESTORED") setAppealDecision("ALLOW");
                      if (v === "SOFTENED") setAppealDecision("LIMIT");
                      if (v === "UPHELD" || v === "REJECTED") {
                        setAppealDecision(
                          selectedAppeal.fromDecision || "BLOCK",
                        );
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="RESTORED">
                      Khôi phục phân phối (ALLOW)
                    </option>
                    <option value="SOFTENED">Nới lỏng (vd Hạn chế)</option>
                    <option value="UPHELD">Giữ nguyên quyết định</option>
                    <option value="REJECTED">Từ chối khiếu nại</option>
                  </select>
                </label>
                <label className="mt-3 block text-xs text-zinc-400">
                  Quyết định áp dụng
                  <select
                    value={appealDecision}
                    onChange={(e) => setAppealDecision(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                  >
                    {DECISION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs text-zinc-400">
                  Ghi chú
                  <textarea
                    value={appealNotes}
                    onChange={(e) => setAppealNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                {appealError ? (
                  <p className="mt-2 text-sm text-red-400">{appealError}</p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSelectedAppeal(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setAppealError("");
                      try {
                        await apiClient.resolveAdminModerationAppeal(
                          token,
                          selectedAppeal.appealId,
                          {
                            outcome: appealOutcome,
                            decision: appealDecision,
                            notes: appealNotes.trim() || undefined,
                          },
                        );
                        setSelectedAppeal(null);
                        await loadAppeals();
                      } catch (e) {
                        setAppealError(
                          e.message ?? "Không xử lý được khiếu nại.",
                        );
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    {submitting ? "Đang lưu…" : "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminLayout>
  );
}
