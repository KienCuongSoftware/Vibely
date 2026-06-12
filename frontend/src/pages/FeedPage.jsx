import React, { useEffect } from "react";
import { useAuth } from "../state/useAuth";
import { VerticalVideoFeed } from "../components/feed/VerticalVideoFeed.jsx";

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
      feedMode="latest"
      activeMenuId="latest"
    />
  );
}

export default FeedPage;
