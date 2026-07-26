/** Gom reply dưới comment gốc — giống TikTok feed. */
export function threadRootId(comment, byId) {
  let cur = comment;
  const seen = new Set();
  for (;;) {
    const id = Number(cur?.id);
    if (!Number.isFinite(id) || seen.has(id)) return id;
    seen.add(id);
    const pid =
      cur.parentCommentId != null ? Number(cur.parentCommentId) : null;
    if (pid == null || Number.isNaN(pid) || !byId.has(pid)) return id;
    cur = byId.get(pid);
  }
}

export function buildFeedCommentThreads(flat) {
  const list = Array.isArray(flat) ? flat : [];
  const byId = new Map(list.map((c) => [Number(c.id), c]));
  const rootComments = list.filter((c) => {
    const pid = c.parentCommentId != null ? Number(c.parentCommentId) : null;
    return pid == null || Number.isNaN(pid) || !byId.has(pid);
  });
  const repliesByRootId = new Map();
  for (const c of list) {
    const rid = threadRootId(c, byId);
    const cid = Number(c.id);
    if (cid === rid) continue;
    if (!repliesByRootId.has(rid)) repliesByRootId.set(rid, []);
    repliesByRootId.get(rid).push(c);
  }
  const byTimeAsc = (a, b) =>
    new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime();
  const byTimeDesc = (a, b) =>
    new Date(b?.createdAt).getTime() - new Date(a?.createdAt).getTime();
  for (const arr of repliesByRootId.values()) {
    arr.sort(byTimeAsc);
  }
  rootComments.sort(byTimeDesc);
  return { rootComments, repliesByRootId };
}

export const FEED_REPLY_PREVIEW_COUNT = 3;
