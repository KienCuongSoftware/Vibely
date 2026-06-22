import { collectFingerprint } from "./fingerprint/collectFingerprint.js";
import { getDeviceHash } from "./sdk/antiBotClient.js";

async function getLocationIfAllowed() {
  if (!("geolocation" in navigator)) return {};
  try {
    if ("permissions" in navigator) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") return {};
    }
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: 5 * 60 * 1000,
      });
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return {};
  }
}

export async function collectLoginContext() {
  const [fingerprint, location] = await Promise.all([
    collectFingerprint().catch(() => null),
    getLocationIfAllowed(),
  ]);
  return {
    ...location,
    fingerprint,
    fingerprintHash: getDeviceHash(),
  };
}
