import { describe, expect, it } from "vitest";
import {
  parseM3u8MediaRefs,
  pickMediaSegmentUrls,
  pickVariantPlaylistUrl,
  resolvePlaylistUrl,
} from "./hlsPrefetchUtils.js";

describe("hlsPrefetchUtils", () => {
  it("resolves relative playlist URLs", () => {
    expect(
      resolvePlaylistUrl(
        "https://cdn.example.com/v/1/playlist.m3u8",
        "720p/index.m3u8",
      ),
    ).toBe("https://cdn.example.com/v/1/720p/index.m3u8");
  });

  it("picks lowest bandwidth variant from master playlist", () => {
    const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1400000
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000
540p/index.m3u8`;
    expect(
      pickVariantPlaylistUrl(
        master,
        "https://cdn.example.com/v/1/playlist.m3u8",
      ),
    ).toBe("https://cdn.example.com/v/1/540p/index.m3u8");
  });

  it("picks first variant when bandwidth tags missing", () => {
    const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
540p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000
720p/index.m3u8`;
    expect(
      pickVariantPlaylistUrl(
        master,
        "https://cdn.example.com/v/1/playlist.m3u8",
      ),
    ).toBe("https://cdn.example.com/v/1/540p/index.m3u8");
  });

  it("picks first ts segments from media playlist", () => {
    const media = `#EXTM3U
#EXTINF:2,
segment_000.ts
#EXTINF:2,
segment_001.ts
#EXTINF:2,
segment_002.ts`;
    expect(
      pickMediaSegmentUrls(
        media,
        "https://cdn.example.com/v/1/720p/index.m3u8",
        2,
      ),
    ).toEqual([
      "https://cdn.example.com/v/1/720p/segment_000.ts",
      "https://cdn.example.com/v/1/720p/segment_001.ts",
    ]);
  });

  it("parseM3u8MediaRefs skips tags", () => {
    expect(
      parseM3u8MediaRefs(
        "#EXTM3U\nseg.ts\n",
        "https://cdn.example.com/x.m3u8",
      ),
    ).toEqual(["https://cdn.example.com/seg.ts"]);
  });
});
