import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { normalizeShareUsername } from "../utils/shareUrl.js";

const DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

function formatCompactCount(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return "0";
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Compact public card for iframe embeds of a creator profile. */
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
          apiClient.getVideosByUsername(username, { page: 0, size: 8 }),
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

  const avatar = useMemo(
    () => String(profile?.avatarUrl ?? "").trim() || DEFAULT_AVATAR,
    [profile?.avatarUrl],
  );

  if (loading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center bg-[#141414] text-sm text-zinc-400">
        Đang tải hồ sơ…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 bg-[#141414] px-4 text-center text-sm text-zinc-400">
        <p>{error || "Không tìm thấy hồ sơ."}</p>
        <Link to="/" className="font-semibold text-[#fe2c55] hover:underline">
          Về Vibely
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[480px] bg-[#141414] text-zinc-100">
      <div className="mx-auto flex max-w-[780px] flex-col p-4">
        <div className="flex items-start gap-3">
          <img
            src={avatar}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">@{username}</p>
            <p className="truncate text-sm text-zinc-400">
              {profile.displayName || username}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
              <span>
                <strong className="text-white">
                  {formatCompactCount(profile.followingCount)}
                </strong>{" "}
                Đang Follow
              </span>
              <span>
                <strong className="text-white">
                  {formatCompactCount(profile.followerCount)}
                </strong>{" "}
                Follower
              </span>
              <span>
                <strong className="text-white">
                  {formatCompactCount(profile.totalLikeCount)}
                </strong>{" "}
                Thích
              </span>
            </div>
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-3 line-clamp-3 text-sm text-zinc-300">{profile.bio}</p>
        ) : null}

        {videos.length > 0 ? (
          <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {videos.slice(0, 10).map((video) => (
              <a
                key={String(video.publicId)}
                href={`/@${username}`}
                target="_blank"
                rel="noreferrer"
                className="aspect-[9/16] overflow-hidden rounded-md bg-zinc-800"
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-sm font-bold">Vibely</span>
          <a
            href={`/@${username}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-md bg-[#fe2c55] px-4 text-sm font-semibold text-white"
          >
            Mở Vibely
          </a>
        </div>
      </div>
    </div>
  );
}
