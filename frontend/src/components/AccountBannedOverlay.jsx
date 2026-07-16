import React, { useEffect, useMemo, useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import { apiClient } from "../api/client";

const BANNED_APPEAL_EMAIL_STORAGE_KEY = "vibely:bannedAppealEmail";

function readStoredBannedAppealEmail() {
  try {
    const stored = sessionStorage.getItem(BANNED_APPEAL_EMAIL_STORAGE_KEY);
    if (!stored) return "";
    const normalized = stored.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function persistBannedAppealEmail(email) {
  try {
    const normalized = String(email ?? "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      sessionStorage.setItem(BANNED_APPEAL_EMAIL_STORAGE_KEY, normalized);
    }
  } catch {
    // ignore
  }
}

function clearStoredBannedAppealEmail() {
  try {
    sessionStorage.removeItem(BANNED_APPEAL_EMAIL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function resolveBannedAccountEmail(payload = {}) {
  const direct =
    String(payload?.accountEmail ?? payload?.email ?? "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) {
    return direct;
  }
  return readStoredBannedAppealEmail();
}

/** Global ban modal — shown on any route when session receives ACCOUNT_BANNED. */
export function AccountBannedOverlay({ payload, onClose }) {
  const open = Boolean(payload);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealDescription, setAppealDescription] = useState("");
  const [appealEmail, setAppealEmail] = useState("");
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealError, setAppealError] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  const bannedReason = useMemo(
    () => String(payload?.reason ?? "").trim(),
    [payload],
  );
  const bannedMaskedEmail = useMemo(
    () => String(payload?.maskedEmail ?? "").trim(),
    [payload],
  );

  useEffect(() => {
    if (!open) {
      setAppealOpen(false);
      setAppealDescription("");
      setAppealEmail("");
      setAppealError("");
      setAppealLoading(false);
      setAppealSent(false);
      return;
    }
    const accountEmail = resolveBannedAccountEmail(payload);
    if (accountEmail) {
      persistBannedAppealEmail(accountEmail);
      setAppealEmail(accountEmail);
    }
  }, [open, payload]);

  if (!open) {
    return null;
  }

  const normalizedAppealEmail = appealEmail.trim().toLowerCase();
  const canSubmitAppeal =
    !appealLoading &&
    appealDescription.trim().length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAppealEmail);

  const handleDismiss = () => {
    clearStoredBannedAppealEmail();
    onClose?.();
  };

  const submitAppeal = async () => {
    if (!canSubmitAppeal) return;
    setAppealLoading(true);
    setAppealError("");
    try {
      await apiClient.submitBanAppeal({
        email: normalizedAppealEmail,
        description: appealDescription.trim(),
        banReason: bannedReason || undefined,
        maskedAccountEmail: bannedMaskedEmail || undefined,
      });
      setAppealSent(true);
      setAppealOpen(false);
    } catch (error) {
      setAppealError(
        error instanceof Error ? error.message : "Không gửi được khiếu nại.",
      );
    } finally {
      setAppealLoading(false);
    }
  };

  if (appealOpen) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-zinc-800 bg-[#121212] shadow-2xl">
          <div className="relative border-b border-zinc-800 px-4 py-4">
            <button
              type="button"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-900"
              onClick={() => setAppealOpen(false)}
              disabled={appealLoading}
              aria-label="Quay lại"
            >
              <IoArrowBack className="h-5 w-5" />
            </button>
            <h2 className="text-center text-[17px] font-bold text-zinc-100">
              Gửi khiếu nại
            </h2>
          </div>
          <div className="scrollbar-none max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
            <label className="block text-[13px] font-semibold text-zinc-100">
              Email tài khoản
            </label>
            <input
              type="email"
              value={appealEmail}
              onChange={(e) => setAppealEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              placeholder="email@example.com"
              disabled={appealLoading}
            />
            <label className="mt-4 block text-[13px] font-semibold text-zinc-100">
              Mô tả
            </label>
            <textarea
              value={appealDescription}
              onChange={(e) => setAppealDescription(e.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              placeholder="Giải thích vì sao bạn cho rằng đây là nhầm lẫn…"
              disabled={appealLoading}
            />
            {appealError ? (
              <p className="mt-3 text-sm text-red-400">{appealError}</p>
            ) : null}
          </div>
          <div className="border-t border-zinc-800 px-5 py-4">
            <button
              type="button"
              disabled={!canSubmitAppeal}
              onClick={() => void submitAppeal()}
              className="flex h-11 w-full items-center justify-center rounded-md bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {appealLoading ? "Đang gửi…" : "Gửi khiếu nại"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[340px] overflow-hidden rounded-sm border border-zinc-800 bg-[#121212] text-center shadow-2xl">
        <div className="px-6 py-6">
          <h2 className="text-xl font-bold text-zinc-100">
            Tài khoản của bạn đã bị cấm
          </h2>
          {appealSent ? (
            <p className="mt-4 text-[13px] leading-relaxed text-emerald-400">
              Đã gửi khiếu nại. Chúng tôi sẽ xem xét và phản hồi qua email.
            </p>
          ) : (
            <>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-300">
                Tài khoản bạn đã bị cấm vì{" "}
                <span className="font-semibold text-zinc-100">
                  {bannedReason || "vi phạm chính sách cộng đồng của Vibely"}
                </span>
                .
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
                Nếu bạn cho rằng đây là một sự nhầm lẫn, bạn có thể gửi khiếu
                nại.
              </p>
            </>
          )}
        </div>
        <div className="border-t border-zinc-800">
          {!appealSent ? (
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center text-[15px] font-semibold text-white transition hover:bg-zinc-900"
              onClick={() => setAppealOpen(true)}
            >
              Khiếu nại
            </button>
          ) : null}
          <button
            type="button"
            className="h-12 w-full border-t border-zinc-800 text-[15px] font-medium text-zinc-200 hover:bg-zinc-900"
            onClick={handleDismiss}
          >
            {appealSent ? "Đóng" : "Bỏ qua"}
          </button>
        </div>
      </div>
    </div>
  );
}
