import { getDeviceHash, readVerificationToken } from "../sdk/antiBotClient.js";
import { getOrCreateSessionId } from "../sessionId.js";

export const CAPTCHA_VERIFICATION_HEADER = "X-Captcha-Verification";

export function buildAntiBotHeaders(extra = {}) {
  const headers = {
    ...extra,
    "X-Session-Id": getOrCreateSessionId(),
  };
  const deviceHash = getDeviceHash();
  if (deviceHash) {
    headers["X-Device-Hash"] = deviceHash;
  }
  const verificationToken = readVerificationToken();
  if (verificationToken) {
    headers[CAPTCHA_VERIFICATION_HEADER] = verificationToken;
  }
  return headers;
}
