import { describe, expect, it } from "vitest";
import { sortChatConversations } from "./chatConversations.js";

describe("sortChatConversations", () => {
  it("places pinned conversations before unpinned", () => {
    const sorted = sortChatConversations([
      { id: 1, pinned: false, lastMessageAt: "2026-07-05T10:00:00Z" },
      { id: 2, pinned: true, lastMessageAt: "2026-06-01T10:00:00Z" },
    ]);
    expect(sorted.map((row) => row.id)).toEqual([2, 1]);
  });

  it("sorts by lastMessageAt within the same pin group", () => {
    const sorted = sortChatConversations([
      { id: 1, pinned: true, lastMessageAt: "2026-06-01T10:00:00Z" },
      { id: 2, pinned: true, lastMessageAt: "2026-07-05T10:00:00Z" },
    ]);
    expect(sorted.map((row) => row.id)).toEqual([2, 1]);
  });
});
