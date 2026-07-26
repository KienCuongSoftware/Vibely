/** Sort inbox: pinned conversations first, then by last activity (TikTok-style). */
export function sortChatConversations(list) {
  return [...list].sort((a, b) => {
    const aPinned = Boolean(a?.pinned);
    const bPinned = Boolean(b?.pinned);
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
    return (
      new Date(b?.lastMessageAt ?? 0).getTime() -
      new Date(a?.lastMessageAt ?? 0).getTime()
    );
  });
}
