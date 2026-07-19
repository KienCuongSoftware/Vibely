import { collectFingerprint } from "./fingerprint/collectFingerprint.js";
import { getDeviceHash } from "./sdk/antiBotClient.js";

function locationPermissionMessage(error) {
  if (error?.code === 1) {
    return "Vui lòng cho phép Vibely truy cập vị trí trên trình duyệt rồi gửi lại mã xác minh.";
  }
  if (error?.code === 3) {
    return "Không lấy được vị trí kịp thời. Vui lòng kiểm tra GPS/mạng rồi thử lại.";
  }
  return "Không lấy được vị trí hiện tại. Vui lòng bật quyền Location trên trình duyệt rồi thử lại.";
}

function withHardTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("Geolocation timed out");
        error.code = 3;
        reject(error);
      }, ms);
    }),
  ]);
}

async function getLocationIfAllowed({ requireLocation = false } = {}) {
  if (!("geolocation" in navigator)) {
    if (requireLocation) {
      throw new Error("Trình duyệt này không hỗ trợ định vị. Vui lòng dùng trình duyệt khác để kích hoạt lại tài khoản.");
    }
    return {};
  }
  try {
    if ("permissions" in navigator) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        if (requireLocation) {
          throw new Error("Quyền Location đang bị chặn. Vui lòng mở cài đặt trang web và cho phép Vibely truy cập vị trí.");
        }
        return {};
      }
      // Avoid the browser permission dialog on normal login — it can hang until the user clicks
      // Allow/Block (native geolocation timeout often does not fire while the prompt is open).
      if (permission.state === "prompt" && !requireLocation) {
        return {};
      }
    }
    const geoTimeoutMs = requireLocation ? 10000 : 3500;
    const position = await withHardTimeout(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: geoTimeoutMs,
          maximumAge: requireLocation ? 0 : 5 * 60 * 1000,
        });
      }),
      geoTimeoutMs + 500,
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    if (requireLocation) {
      throw error instanceof Error ? error : new Error(locationPermissionMessage(error));
    }
    return {};
  }
}

export async function collectLoginContext(options = {}) {
  const [fingerprint, location] = await Promise.all([
    collectFingerprint().catch(() => null),
    getLocationIfAllowed(options),
  ]);
  return {
    ...location,
    fingerprint,
    fingerprintHash: getDeviceHash(),
  };
}
