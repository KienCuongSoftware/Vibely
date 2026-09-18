import { describe, expect, it } from "vitest";
import { computeMatchGain } from "./photoFeedAudioBoost.js";

function fakeBuffer({ peak = 0.2, rmsish = 0.05, length = 1000 } = {}) {
  const data = new Float32Array(length);
  // Square-ish wave at rmsish amplitude, clipped to peak.
  const amp = Math.min(peak, rmsish * Math.SQRT2);
  for (let i = 0; i < length; i += 1) {
    data[i] = i % 2 === 0 ? amp : -amp;
  }
  return {
    length,
    numberOfChannels: 1,
    getChannelData: () => data,
  };
}

describe("computeMatchGain", () => {
  it("boosts quiet buffers toward the target", () => {
    const quiet = fakeBuffer({ peak: 0.1, rmsish: 0.04 });
    const gain = computeMatchGain(quiet, 0.14);
    expect(gain).toBeGreaterThan(1.5);
    expect(gain).toBeLessThanOrEqual(4);
  });

  it("does not explode already-loud buffers", () => {
    const loud = fakeBuffer({ peak: 0.95, rmsish: 0.2 });
    const gain = computeMatchGain(loud, 0.14);
    expect(gain).toBeLessThanOrEqual(1.2);
    expect(gain).toBeGreaterThanOrEqual(0.9);
  });
});
