import { emitAccountBanned } from "@/features/auth/utils/accountBanBridge.js";
import { isCookieSession } from "@/features/auth/utils/session.js";
import { buildApiUrl } from "@/shared/config/apiBase.js";
import i18n from "@/i18n/i18n.js";

const ERROR_CODE_KEYS = {
  AUTH_REQUIRED: "errors.AUTH_REQUIRED",
  ACCESS_DENIED: "errors.ACCESS_DENIED",
  RATE_LIMITED: "errors.RATE_LIMITED",
  CAPTCHA_REQUIRED: "errors.CAPTCHA_REQUIRED",
  ACCOUNT_BANNED: "errors.ACCOUNT_BANNED",
  ACCOUNT_DEACTIVATED: "errors.ACCOUNT_DEACTIVATED",
  SUSPICIOUS_LOGIN: "errors.SUSPICIOUS_LOGIN",
  STORAGE_DELETION_FAILED: "errors.STORAGE_DELETION_FAILED",
  VALIDATION_ERROR: "errors.VALIDATION_ERROR",
  BAD_REQUEST: "errors.BAD_REQUEST",
  NOT_FOUND: "errors.NOT_FOUND",
  INTERNAL_SERVER_ERROR: "errors.INTERNAL_SERVER_ERROR",
};

/** Only used after MESSAGE_TO_KEY miss (step 3). */
const GENERIC_FALLBACK_CODES = new Set(["BAD_REQUEST", "NOT_FOUND", "VALIDATION_ERROR"]);

/**
 * Exact BE messages (VI originals + EN equivalents) → i18n key.
 */
const MESSAGE_TO_KEY = {
  // Auth / session
  "Bạn cần đăng nhập để tiếp tục": "errors.AUTH_REQUIRED",
  "Bạn cần đăng nhập để tiếp tục.": "errors.AUTH_REQUIRED",
  "You need to log in to continue": "errors.AUTH_REQUIRED",
  "You need to log in to continue.": "errors.AUTH_REQUIRED",
  "Thông tin đăng nhập không chính xác": "errors.INVALID_CREDENTIALS",
  "Incorrect login information": "errors.INVALID_CREDENTIALS",
  "Incorrect login credentials": "errors.INVALID_CREDENTIALS",
  "Invalid credentials": "errors.INVALID_CREDENTIALS",
  "Email đã được sử dụng": "errors.EMAIL_IN_USE",
  "Email is already in use": "errors.EMAIL_IN_USE",
  "Vibely ID đã tồn tại": "errors.USERNAME_TAKEN",
  "Vibely ID already exists": "errors.USERNAME_TAKEN",
  "Vibely ID already exists.": "errors.USERNAME_TAKEN",
  "Không tìm thấy tài khoản với email này": "errors.ACCOUNT_EMAIL_NOT_FOUND",
  "No account found with this email": "errors.ACCOUNT_EMAIL_NOT_FOUND",
  "Phiên đăng nhập không hợp lệ hoặc đã hết hạn": "errors.SESSION_EXPIRED",
  "Phiên đăng nhập đã hết hạn": "errors.SESSION_EXPIRED",
  "Session is invalid or has expired": "errors.SESSION_EXPIRED",
  "Session has expired": "errors.SESSION_EXPIRED",
  "Refresh token đã hết hạn hoặc đã bị thu hồi": "errors.REFRESH_EXPIRED",
  "Refresh token has expired or been revoked": "errors.REFRESH_EXPIRED",
  "Tài khoản của bạn đã bị cấm": "errors.ACCOUNT_BANNED",
  "Your account has been banned": "errors.ACCOUNT_BANNED",
  "Your account has been banned.": "errors.ACCOUNT_BANNED",
  "Tài khoản đã bị hủy kích hoạt": "errors.ACCOUNT_DEACTIVATED",
  "Account has been deactivated": "errors.ACCOUNT_DEACTIVATED",
  "Tài khoản hoặc IP tạm thời bị khóa do nhiều lần đăng nhập thất bại": "errors.SUSPICIOUS_LOGIN",
  "Account or IP temporarily locked due to too many failed login attempts": "errors.SUSPICIOUS_LOGIN",
  "Yêu cầu xác minh captcha trước khi tiếp tục": "errors.CAPTCHA_REQUIRED",
  "Yêu cầu xác minh captcha": "errors.CAPTCHA_REQUIRED",
  "Please complete captcha verification to continue": "errors.CAPTCHA_REQUIRED",
  "Captcha verification required": "errors.CAPTCHA_REQUIRED",
  "Captcha token không hợp lệ hoặc đã hết hạn": "errors.CAPTCHA_INVALID",
  "Captcha token is invalid or expired": "errors.CAPTCHA_INVALID",
  "Captcha đã được sử dụng": "errors.CAPTCHA_USED",
  "Captcha has already been used": "errors.CAPTCHA_USED",
  "Vượt quá số lần thử captcha": "errors.CAPTCHA_ATTEMPTS",
  "Too many captcha attempts": "errors.CAPTCHA_ATTEMPTS",
  "Mã xác minh đã hết hạn": "errors.OTP_EXPIRED",
  "Verification code has expired": "errors.OTP_EXPIRED",
  "Mã xác minh không chính xác": "errors.OTP_INVALID",
  "Mã OTP không hợp lệ": "errors.INVALID_OTP",
  "OTP không hợp lệ hoặc đã hết hạn": "errors.INVALID_OTP",
  "Invalid OTP code": "errors.INVALID_OTP",
  "OTP is invalid or expired": "errors.INVALID_OTP",
  "Verification code is incorrect": "errors.OTP_INVALID",
  "Mã xác minh là bắt buộc": "errors.OTP_REQUIRED",
  "Verification code is required": "errors.OTP_REQUIRED",
  "Mã xác minh phải gồm 6 chữ số": "errors.OTP_LENGTH",
  "Verification code must be 6 digits": "errors.OTP_LENGTH",
  "Bạn thao tác quá nhanh, vui lòng thử lại sau": "errors.RATE_LIMITED",
  "Quá nhiều yêu cầu, vui lòng thử lại sau": "errors.RATE_LIMITED",
  "Too many requests. Please try again later": "errors.RATE_LIMITED",
  "Too many requests. Please try again later.": "errors.RATE_LIMITED",
  "Mục đích mã OTP không hợp lệ": "errors.OTP_PURPOSE_INVALID",
  "Invalid OTP purpose": "errors.OTP_PURPOSE_INVALID",
  "Phiên kích hoạt lại tài khoản không hợp lệ hoặc đã hết hạn": "errors.REACTIVATION_EXPIRED",
  "Reactivation session is invalid or has expired": "errors.REACTIVATION_EXPIRED",
  "Tài khoản này đang hoạt động": "errors.ACCOUNT_ALREADY_ACTIVE",
  "This account is already active": "errors.ACCOUNT_ALREADY_ACTIVE",
  "Tài khoản đã bị cấm và không thể tự kích hoạt lại": "errors.ACCOUNT_BANNED_NO_REACTIVATE",
  "Account is banned and cannot be reactivated": "errors.ACCOUNT_BANNED_NO_REACTIVATE",
  "Bạn không có quyền thực hiện thao tác này": "errors.ACCESS_DENIED",
  "Bạn không có quyền truy cập tài nguyên này": "errors.ACCESS_DENIED",
  "You don't have permission to do that.": "errors.ACCESS_DENIED",
  "You don't have permission to do that": "errors.ACCESS_DENIED",
  "You do not have permission to access this resource": "errors.ACCESS_DENIED",
  "You do not have permission to perform this action": "errors.ACCESS_DENIED",
  "Lỗi hệ thống, vui lòng thử lại sau": "errors.INTERNAL_SERVER_ERROR",
  "Hệ thống đang bận, vui lòng thử lại sau": "errors.INTERNAL_SERVER_ERROR",
  "The system is busy. Please try again later.": "errors.INTERNAL_SERVER_ERROR",
  "Dữ liệu không hợp lệ": "errors.VALIDATION_ERROR",
  "Dữ liệu gửi lên chưa hợp lệ": "errors.VALIDATION_ERROR",
  "Invalid data": "errors.VALIDATION_ERROR",
  "Submitted data is invalid": "errors.VALIDATION_ERROR",
  "Yêu cầu chưa hợp lệ": "errors.BAD_REQUEST",
  "Invalid request": "errors.BAD_REQUEST",
  "Không thể xóa file trên kho lưu trữ. Vui lòng thử lại sau.": "errors.STORAGE_DELETION_FAILED",
  "Could not delete file from storage. Please try again later.": "errors.STORAGE_DELETION_FAILED",
  "Email là bắt buộc": "errors.EMAIL_REQUIRED",
  "Email is required": "errors.EMAIL_REQUIRED",
  "Email không hợp lệ": "errors.EMAIL_INVALID",
  "Invalid email": "errors.EMAIL_INVALID",
  "Mật khẩu là bắt buộc": "errors.PASSWORD_REQUIRED",
  "Password is required": "errors.PASSWORD_REQUIRED",
  "Mật khẩu phải từ 6 đến 100 ký tự": "errors.PASSWORD_LENGTH",
  "Password must be between 6 and 100 characters": "errors.PASSWORD_LENGTH",
  "Tên hiển thị là bắt buộc": "errors.DISPLAY_NAME_REQUIRED",
  "Display name is required": "errors.DISPLAY_NAME_REQUIRED",
  "Ngày sinh là bắt buộc": "errors.BIRTH_DATE_REQUIRED",
  "Date of birth is required": "errors.BIRTH_DATE_REQUIRED",
  "Đăng nhập để xem feed Đã follow": "errors.LOGIN_FOLLOWING_FEED",
  "Log in to view the Following feed": "errors.LOGIN_FOLLOWING_FEED",

  // Profile / user
  "Vibely ID chỉ gồm chữ thường, số, dấu chấm và gạch dưới (4-24 ký tự)": "errors.USERNAME_FORMAT",
  "Vibely ID may only contain lowercase letters, numbers, dots and underscores (4-24 characters)":
    "errors.USERNAME_FORMAT",
  "Bạn chỉ có thể thay đổi biệt danh 7 ngày một lần.": "errors.DISPLAY_NAME_COOLDOWN",
  "You can only change your display name once every 7 days.": "errors.DISPLAY_NAME_COOLDOWN",
  "Không có cài đặt quyền riêng tư để cập nhật": "errors.PRIVACY_NOTHING_TO_UPDATE",
  "No privacy settings to update": "errors.PRIVACY_NOTHING_TO_UPDATE",
  "Cài đặt bình luận không hợp lệ": "errors.INVALID_COMMENT_SETTING",
  "Invalid comment setting": "errors.INVALID_COMMENT_SETTING",
  "Cài đặt tin nhắn kết nối tiềm năng không hợp lệ": "errors.INVALID_DM_POTENTIAL_SETTING",
  "Invalid potential-connection message setting": "errors.INVALID_DM_POTENTIAL_SETTING",
  "Cài đặt tin nhắn từ người khác không hợp lệ": "errors.INVALID_DM_OTHERS_SETTING",
  "Invalid message setting from others": "errors.INVALID_DM_OTHERS_SETTING",
  "Khu vực tài khoản không hợp lệ": "errors.INVALID_ACCOUNT_REGION",
  "Invalid account region": "errors.INVALID_ACCOUNT_REGION",
  "Không tìm thấy người dùng": "errors.USER_NOT_FOUND",
  "User not found": "errors.USER_NOT_FOUND",
  "Tài khoản đã bị cấm và không còn khả dụng": "errors.ACCOUNT_BANNED_UNAVAILABLE",
  "Account has been banned and is no longer available": "errors.ACCOUNT_BANNED_UNAVAILABLE",

  // Chat
  "Không tìm thấy người dùng để nhắn tin": "errors.CHAT_USER_NOT_FOUND",
  "User to message was not found": "errors.CHAT_USER_NOT_FOUND",
  "Bạn không thể tự nhắn tin với chính mình": "errors.CHAT_SELF",
  "You cannot message yourself": "errors.CHAT_SELF",
  "Nội dung tin nhắn là bắt buộc": "errors.CHAT_MESSAGE_REQUIRED",
  "Message content is required": "errors.CHAT_MESSAGE_REQUIRED",
  "Bạn chỉ có thể gửi 1 tin nhắn khi yêu cầu chưa được chấp nhận": "errors.CHAT_REQUEST_LIMIT",
  "You can only send 1 message while the request is pending": "errors.CHAT_REQUEST_LIMIT",
  "Không tìm thấy hội thoại": "errors.CHAT_CONVERSATION_NOT_FOUND",
  "Conversation not found": "errors.CHAT_CONVERSATION_NOT_FOUND",
  "Người này không nhận tin nhắn từ kết nối tiềm năng.": "errors.CHAT_POTENTIAL_BLOCKED",
  "This person does not accept messages from potential connections.": "errors.CHAT_POTENTIAL_BLOCKED",
  "Người này không nhận tin nhắn từ người lạ.": "errors.CHAT_STRANGER_BLOCKED",
  "This person does not accept messages from strangers.": "errors.CHAT_STRANGER_BLOCKED",
  "Định dạng media tin nhắn không hợp lệ.": "errors.CHAT_MEDIA_FORMAT",
  "Invalid chat media format.": "errors.CHAT_MEDIA_FORMAT",
  "URL media tin nhắn là bắt buộc.": "errors.CHAT_MEDIA_URL_REQUIRED",
  "Chat media URL is required.": "errors.CHAT_MEDIA_URL_REQUIRED",
  "Không tìm thấy thành viên hội thoại": "errors.CHAT_MEMBER_NOT_FOUND",
  "Conversation member not found": "errors.CHAT_MEMBER_NOT_FOUND",

  // Interactions
  "Bạn không thể tự theo dõi chính mình": "errors.FOLLOW_SELF",
  "Không thể theo dõi chính mình": "errors.FOLLOW_SELF",
  "You cannot follow yourself": "errors.FOLLOW_SELF",
  "Yêu cầu follow không còn hiệu lực": "errors.FOLLOW_REQUEST_INVALID",
  "Follow request is no longer valid": "errors.FOLLOW_REQUEST_INVALID",
  "Nhà sáng tạo này đã giới hạn quyền truy cập bình luận": "errors.COMMENTS_RESTRICTED",
  "This creator has limited who can comment": "errors.COMMENTS_RESTRICTED",
  "Bạn không thể xóa bình luận này.": "errors.COMMENT_DELETE_FORBIDDEN",
  "You cannot delete this comment.": "errors.COMMENT_DELETE_FORBIDDEN",
  "Không tìm thấy bình luận": "errors.COMMENT_NOT_FOUND",
  "Comment not found": "errors.COMMENT_NOT_FOUND",
  "Bình luận không thuộc video này.": "errors.COMMENT_WRONG_VIDEO",
  "Comment does not belong to this video.": "errors.COMMENT_WRONG_VIDEO",
  "Không tìm thấy video": "errors.VIDEO_NOT_FOUND",
  "Video not found": "errors.VIDEO_NOT_FOUND",
  "Video không tồn tại": "errors.VIDEO_NOT_FOUND",
  "Video không khả dụng.": "errors.VIDEO_UNAVAILABLE",
  "Video is unavailable.": "errors.VIDEO_UNAVAILABLE",
  "Video chưa sẵn sàng hoặc không khả dụng.": "errors.VIDEO_NOT_READY",
  "Video is not ready or unavailable.": "errors.VIDEO_NOT_READY",
  "Chỉ có thể báo cáo video đang công khai.": "errors.REPORT_PUBLIC_ONLY",
  "You can only report public videos.": "errors.REPORT_PUBLIC_ONLY",
  "Video đã bị ẩn trước đó": "errors.VIDEO_ALREADY_HIDDEN",
  "Video was already hidden": "errors.VIDEO_ALREADY_HIDDEN",
  "Không tìm thấy bài đăng": "errors.POST_NOT_FOUND",
  "Post not found": "errors.POST_NOT_FOUND",

  // Upload
  "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.": "errors.AVATAR_FORMAT",
  "Only JPG, PNG or WebP images are accepted.": "errors.AVATAR_FORMAT",
  "Chỉ chấp nhận video MP4, WebM hoặc MOV.": "errors.VIDEO_FORMAT",
  "Only MP4, WebM or MOV videos are accepted.": "errors.VIDEO_FORMAT",
  "Thiếu kích thước tệp video.": "errors.VIDEO_SIZE_REQUIRED",
  "Video file size is required.": "errors.VIDEO_SIZE_REQUIRED",
  "Video vượt quá giới hạn 30 GB.": "errors.VIDEO_TOO_LARGE",
  "Video exceeds the 30 GB limit.": "errors.VIDEO_TOO_LARGE",
};

/** Prefixes for messages that include dynamic suffixes. */
const MESSAGE_PREFIX_TO_KEY = [
  ["Vibely ID đã tồn tại", "errors.USERNAME_TAKEN"],
  ["Vibely ID already exists", "errors.USERNAME_TAKEN"],
  ["Bạn chỉ có thể thay đổi biệt danh 7 ngày một lần", "errors.DISPLAY_NAME_COOLDOWN"],
  ["You can only change your display name once every 7 days", "errors.DISPLAY_NAME_COOLDOWN"],
  ["Tài khoản đã bị cấm và không còn khả dụng", "errors.ACCOUNT_BANNED_UNAVAILABLE"],
  ["Account has been banned and is no longer available", "errors.ACCOUNT_BANNED_UNAVAILABLE"],
  ["Không tìm thấy tài nguyên:", "errors.NOT_FOUND"],
  ["Resource not found:", "errors.NOT_FOUND"],
];

function tError(key, options) {
  return i18n.t(key, options);
}

function mapMessageToKey(msg) {
  if (!msg) return null;
  if (MESSAGE_TO_KEY[msg]) return MESSAGE_TO_KEY[msg];
  for (const [prefix, key] of MESSAGE_PREFIX_TO_KEY) {
    if (msg.startsWith(prefix)) return key;
  }
  return null;
}

/**
 * 1. Specific ERROR_CODE_KEYS (not BAD_REQUEST / NOT_FOUND / VALIDATION_ERROR)
 * 2. MESSAGE_TO_KEY (VI + EN)
 * 3. Remaining ERROR_CODE_KEYS (incl. coarse codes)
 * 4. Non-empty message, else status / generic
 */
function localizeError(code, fallbackMessage, status) {
  const msg = String(fallbackMessage ?? "").trim();

  if (code && ERROR_CODE_KEYS[code] && !GENERIC_FALLBACK_CODES.has(code)) {
    return tError(ERROR_CODE_KEYS[code]);
  }

  const mappedKey = mapMessageToKey(msg);
  if (mappedKey) {
    return tError(mappedKey);
  }

  if (code && ERROR_CODE_KEYS[code]) {
    return tError(ERROR_CODE_KEYS[code]);
  }

  if (msg) {
    return msg;
  }

  if (status === 401) {
    return tError("errors.AUTH_REQUIRED");
  }
  if (status === 403) {
    return tError("errors.ACCESS_DENIED");
  }
  if (status >= 500) {
    return tError("errors.INTERNAL_SERVER_ERROR");
  }
  return tError("errors.GENERIC");
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
    let message = tError("errors.REQUEST_FAILED_STATUS", { status: response.status });
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
      const fallbackMessage = payload?.error?.message ?? tError("errors.REQUEST_FAILED");
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
          tError("errors.UPLOAD_FAILED_STATUS", { status: response.status }),
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
        new Error(tError("errors.UPLOAD_FAILED_STATUS", { status: xhr.status })),
      );
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(tError("errors.UPLOAD_FAILED")));
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
