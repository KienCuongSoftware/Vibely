import React, { useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { VerticalVideoFeed } from "@/features/feed/components/VerticalVideoFeed.jsx";

export function FeedPage() {
  const { token, user, logout, authReady } = useAuth();

  useEffect(() => {
      document.title = "Xem các video thịnh hành dành cho bạn | Vibely";
  }, []);

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
