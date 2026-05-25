import { describe, expect, it } from "vitest";
import {
  buildProfileVideoUrl,
  buildVideoWatchUrl,
  isVideoPublicId,
  normalizeVideoPublicId,
  shareIdempotencyKey,
  videoPublicIdOf,
} from "./videoPublicId.js";

const SAMPLE =
  "018fc2c7-f2e9-7a41-b9d7-0123456789ab";

describe("videoPublicId", () => {
  it("accepts UUID public ids and rejects numeric-only", () => {
    expect(normalizeVideoPublicId(SAMPLE)).toBe(SAMPLE);
    expect(isVideoPublicId(SAMPLE)).toBe(true);
    expect(normalizeVideoPublicId("123")).toBeNull();
    expect(isVideoPublicId("123")).toBe(false);
  });

  it("builds watch and profile urls", () => {
    expect(buildVideoWatchUrl(SAMPLE)).toContain(`/watch/${SAMPLE}`);
    expect(buildProfileVideoUrl("creator", SAMPLE)).toBe(
      "/creator/video/" + SAMPLE,
    );
  });

  it("reads publicId from video objects", () => {
    expect(videoPublicIdOf({ publicId: SAMPLE })).toBe(SAMPLE);
    expect(videoPublicIdOf({ id: 99 })).toBeNull();
  });

  it("builds stable share idempotency keys", () => {
    expect(shareIdempotencyKey("whatsapp", SAMPLE)).toBe(
      `whatsapp:${SAMPLE}`,
    );
  });
});
