import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { ProfileEmbedPreview } from "../components/ProfileEmbedPreview.jsx";
import { normalizeShareUsername } from "../utils/shareUrl.js";

/**
 * Public dark embed page for iframe embeds — same preview as modal left pane.
 * Route: /embed/profile/:username
 */
export function ProfileEmbedPage() {
  const { username: rawUsername } = useParams();
  const username = normalizeShareUsername(rawUsername);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = username ? `@${username} | Vibely` : "Vibely";
  }, [username]);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError("Không tìm thấy hồ sơ.");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    ;(async () => {
      try {
        const [profileData, videoData] = await Promise.all([
          apiClient.getPublicProfile(username),
          apiClient.getVideosByUsername(username, { page: 0, size: 9 }),
        ]);
        if (cancelled) return;
        setProfile(profileData ?? null);
        setVideos(Array.isArray(videoData?.items) ? videoData.items : []);
      } catch (e) {
        if (!cancelled) {
          setProfile(null);
          setVideos([]);
          setError(e?.message || "Không tải được hồ sơ.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-sm text-zinc-400">
        Đang tải hồ sơ…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0a0a] px-4 text-center text-sm text-zinc-400">
        <p>{error || "Không tìm thấy hồ sơ."}</p>
        <Link to="/" className="font-semibold text-[#fe2c55] hover:underline">
          Về Vibely
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-[#0a0a0a] p-0 sm:items-center sm:p-6">
      <ProfileEmbedPreview
        className="h-full min-h-dvh w-full max-w-[780px] rounded-none border-0 shadow-none sm:min-h-[520px] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        username={username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        bio={profile.bio}
        followingCount={profile.followingCount}
        followerCount={profile.followerCount}
        totalLikeCount={profile.totalLikeCount}
        videos={videos}
        profileHref={`/@${username}`}
      />
    </div>
  );
}
