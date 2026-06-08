import { describe, expect, it } from "vitest";
import { buildFeedCommentThreads } from "./feedCommentThreads.js";

describe("buildFeedCommentThreads", () => {
  it("groups replies under root and sorts roots desc", () => {
    const flat = [
      {
        id: 1,
        parentCommentId: null,
        createdAt: "2026-01-03T00:00:00",
      },
      {
        id: 2,
        parentCommentId: null,
        createdAt: "2026-01-04T00:00:00",
      },
      {
        id: 3,
        parentCommentId: 1,
        createdAt: "2026-01-03T01:00:00",
      },
    ];
    const { rootComments, repliesByRootId } = buildFeedCommentThreads(flat);
    expect(rootComments.map((c) => c.id)).toEqual([2, 1]);
    expect(repliesByRootId.get(1)?.map((c) => c.id)).toEqual([3]);
  });
});
