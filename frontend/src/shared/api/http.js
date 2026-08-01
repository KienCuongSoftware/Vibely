import { emitAccountBanned } from "@/features/auth/utils/accountBanBridge.js";
import { isCookieSession } from "@/features/auth/utils/session.js";
import { buildApiUrl } from "@/shared/config/apiBase.js";

const ERROR_MESSAGES_VI = {
  AUTH_REQUIRED: "Bạn cần đăng nhập để tiếp tục.",
  ACCESS_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  RATE_LIMITED: "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
  CAPTCHA_REQUIRED: "Yêu cầu xác minh captcha trước khi tiếp tục.",
  ACCOUNT_BANNED: "Tài khoản của bạn đã bị cấm.",
  VALIDATION_ERROR: "Dữ liệu gửi lên chưa hợp lệ.",
  BAD_REQUEST: "Yêu cầu chưa hợp lệ, vui lòng kiểm tra lại.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang bận, vui lòng thử lại sau.",
};

const LEGACY_ACCESS_DENIED_MESSAGE = "Bạn không có quyền truy cập tài nguyên này";

function localizeError(code, fallbackMessage, status) {
  const msg = String(fallbackMessage ?? "").trim();
  if (msg && msg !== LEGACY_ACCESS_DENIED_MESSAGE) {
    return msg;
  }
  if (code && ERROR_MESSAGES_VI[code]) {
    return ERROR_MESSAGES_VI[code];
  }
  if (status === 401) {
    return ERROR_MESSAGES_VI.AUTH_REQUIRED;
  }
  if (status === 403) {
    return ERROR_MESSAGES_VI.ACCESS_DENIED;
  }
  if (status >= 500) {
    return ERROR_MESSAGES_VI.INTERNAL_SERVER_ERROR;
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

function readCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie() {
  if (typeof document === "undefined" || readCsrfToken()) return;
  try {
    await fetch(buildApiUrl("/api/health"), { credentials: "include" });
  } catch {
    /* health probe is best-effort */
  }
}

export async function request(path, { method = "GET", body, token, headers: extraHeaders } = {}) {
  const headers = { "Content-Type": "application/json", ...(extraHeaders || {}) };
  if (token && !isCookieSession(token)) {
    headers.Authorization = `Bearer ${token}`;
  }
  const upperMethod = String(method).toUpperCase();
  if (upperMethod !== "GET" && upperMethod !== "HEAD" && upperMethod !== "OPTIONS") {
    await ensureCsrfCookie();
    const csrf = readCsrfToken();
    if (csrf) {
      headers["X-XSRF-TOKEN"] = csrf;
    }
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (mã ${response.status})`;
    let code;
    let captchaRequired;
    let errorData;
    try {
      const payload = await response.json();
      code = payload?.error?.code;
      errorData = payload?.data;
      captchaRequired = payload?.data;
      if (payload?.error?.message) {
        message = payload.error.message;
      } else if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message when response is not JSON.
    }
    const err = new Error(localizeError(code, message, response.status));
    err.status = response.status;
    if (errorData) err.data = errorData;
    if (code) err.code = code;
    if (captchaRequired && (response.status === 428 || code === "CAPTCHA_REQUIRED")) {
      err.captchaRequired = captchaRequired;
    }
    if (code === "ACCOUNT_BANNED") {
      emitAccountBanned(errorData ?? {});
    }
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (Object.prototype.hasOwnProperty.call(payload, "success")) {
    if (!payload.success) {
      const code = payload?.error?.code;
      const fallbackMessage = payload?.error?.message ?? "Yêu cầu thất bại";
      const err = new Error(localizeError(code, fallbackMessage, response.status));
      if (code) err.code = code;
      if (payload?.data) err.data = payload.data;
      if (code === "ACCOUNT_BANNED") {
        emitAccountBanned(payload?.data ?? {});
      }
      throw err;
    }
    return payload.data;
  }
  return payload;
}

/** PUT file trực tiếp lên S3 bằng URL đã ký (không qua JSON API). */
export function uploadToPresignedPutUrl(uploadUrl, file, contentType, onProgress, options = {}) {
  const ct = contentType || file?.type || "application/octet-stream";
  const signal = options?.signal;

  if (typeof onProgress !== "function") {
    return fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ct },
      body: file,
      signal,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Tải file lên kho lưu trữ thất bại (mã ${response.status}).`,
        );
      }
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", ct);

    const onAbort = () => {
      xhr.abort();
    };
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 10000) / 100),
      );
      onProgress(percent, { loaded: event.loaded, total: event.total });
    };
    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        const total = file?.size || 0;
        onProgress(100, { loaded: total, total });
        resolve();
        return;
      }
      reject(
        new Error(`Tải file lên kho lưu trữ thất bại (mã ${xhr.status}).`),
      );
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Tải file lên kho lưu trữ thất bại."));
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.send(file);
  });
}

export function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}
