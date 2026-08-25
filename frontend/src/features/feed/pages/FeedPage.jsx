import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { VerticalVideoFeed } from "@/features/feed/components/VerticalVideoFeed.jsx";
import { useNotificationUnread } from "@/features/notification/store/NotificationUnreadContext.jsx";
import { formatUnreadDocumentTitle } from "@/features/notification/utils/notificationBadge.js";

export function FeedPage() {
  const { t } = useTranslation();
  const { token, user, logout, authReady } = useAuth();
  const { unreadCount } = useNotificationUnread();

  useEffect(() => {
    document.title = formatUnreadDocumentTitle(t("forYou.pageTitle"), unreadCount);
  }, [t, unreadCount]);

  return (
    <VerticalVideoFeed
      token={token}
      user={user}
      onLogout={logout}
      authReady={authReady}
      feedMode="for-you"
      activeMenuId="latest"
    />
  );
}

export default FeedPage;
