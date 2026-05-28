import { resolveApiBaseUrl } from "../../config/apiBase.js";
import { collectFingerprint } from "../fingerprint/collectFingerprint.js";
import { detectAutomation } from "../antiAutomation/detectAutomation.js";
import { getOrCreateSessionId } from "../sessionId.js";

const API_BASE_URL = resolveApiBaseUrl();

async function antiBotRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message || "Anti-bot request failed");
  }
  return payload.data;
}

let cachedDeviceHash = null;

export async function bootstrapAntiBot() {
  const sessionId = getOrCreateSessionId();
  const fingerprint = await collectFingerprint();
  const automation = detectAutomation();
  const registration = await antiBotRequest("/api/fingerprint/register", {
    method: "POST",
    body: {
      sessionId,
      fingerprint,
      automation,
    },
  });
  cachedDeviceHash = registration.deviceHash;
  return { sessionId, deviceHash: cachedDeviceHash, fingerprint, automation };
}

export function getDeviceHash() {
  return cachedDeviceHash;
}

export async function evaluateRisk(action, extras = {}) {
  const sessionId = getOrCreateSessionId();
  const fingerprint = await collectFingerprint();
  const automation = detectAutomation();
  return antiBotRequest("/api/risk/evaluate", {
    method: "POST",
    body: {
      sessionId,
      action,
      deviceHash: cachedDeviceHash,
      fingerprint,
      automation,
      context: extras,
    },
  });
}

export async function fetchCaptchaChallenge(level = "ROTATE") {
  const deviceHash = cachedDeviceHash || "";
  const query = new URLSearchParams({ level, deviceHash });
  return antiBotRequest(`/api/captcha/challenge?${query.toString()}`);
}

export async function verifyCaptcha(payload) {
  return antiBotRequest("/api/captcha/verify", {
    method: "POST",
    body: payload,
  });
}

export async function trackBehavior(samples) {
  return antiBotRequest("/api/behavior/track", {
    method: "POST",
    body: {
      sessionId: getOrCreateSessionId(),
      deviceHash: cachedDeviceHash,
      samples,
    },
  });
}

export async function evaluateTrust(userId) {
  return antiBotRequest("/api/trust/evaluate", {
    method: "POST",
    body: {
      userId: userId ?? null,
      deviceHash: cachedDeviceHash,
      sessionId: getOrCreateSessionId(),
    },
  });
}

export const VERIFICATION_TOKEN_KEY = "vibely_ab_verification";

export function storeVerificationToken(token, expiresAtEpochMs) {
  sessionStorage.setItem(
    VERIFICATION_TOKEN_KEY,
    JSON.stringify({ token, expiresAtEpochMs }),
  );
}

export function readVerificationToken() {
  try {
    const raw = sessionStorage.getItem(VERIFICATION_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiresAtEpochMs) {
      sessionStorage.removeItem(VERIFICATION_TOKEN_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function clearVerificationToken() {
  sessionStorage.removeItem(VERIFICATION_TOKEN_KEY);
}
