import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { VerticalVideoFeed } from "@/features/feed/components/VerticalVideoFeed.jsx";

export function FeedPage() {
  const { t } = useTranslation();
  const { token, user, logout, authReady } = useAuth();

  useEffect(() => {
    document.title = t("forYou.pageTitle");
  }, [t]);

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
