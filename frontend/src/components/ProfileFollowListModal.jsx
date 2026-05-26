import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IoClose,
  IoPeopleOutline,
  IoPersonOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import { apiClient } from "../api/client";

const DEFAULT_AVATAR_URL = "/images/users/default-avatar.jpeg";
const FOLLOW_LIST_PAGE_SIZE = 20;
const EMPTY_LIST_STATE = Object.freeze({
  items: [],
  page: 0,
  hasNext: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: "",
  usernameKey: "",
  busyIds: {},
});

const FOLLOW_TABS = Object.freeze([
  { id: "following", label: "Đã follow" },
  { id: "followers", label: "Follower" },
  { id: "friends", label: "Bạn bè" },
  { id: "suggested", label: "Được đề xuất" },
]);

function normalizeUsernameKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function buildProfileHref(username) {
  const normalized = normalizeUsernameKey(username);
  return normalized ? `/@${encodeURIComponent(normalized)}` : "/profile";
}

function createListState() {
  return {
    items: [],
    page: 0,
    hasNext: false,
    loaded: false,
    loading: false,
    loadingMore: false,
    error: "",
    usernameKey: "",
    busyIds: {},
  };
}

function updateFollowStateInLists(prev, userId, followedByViewer) {
  return {
    followers: {
      ...prev.followers,
      items: prev.followers.items.map((item) =>
        item.id === userId ? { ...item, followedByViewer } : item,
      ),
    },
    following: {
      ...prev.following,
      items: prev.following.items.map((item) =>
        item.id === userId ? { ...item, followedByViewer } : item,
      ),
    },
  };
}

function applyBusyState(prev, userId, busy) {
  const apply = (list) => ({
    ...list,
    busyIds: busy
      ? { ...list.busyIds, [userId]: true }
      : Object.fromEntries(
          Object.entries(list.busyIds).filter(([key]) => String(key) !== String(userId)),
        ),
  });
  return {
    followers: apply(prev.followers),
    following: apply(prev.following),
  };
}

function mergeBusyIds(...groups) {
  return Object.assign({}, ...groups);
}

function buildDerivedList(baseList, items, overrides = {}) {
  return {
    ...EMPTY_LIST_STATE,
    items,
    loaded: true,
    usernameKey: baseList.usernameKey,
    busyIds: baseList.busyIds,
    ...overrides,
  };
}

function emptyStateContent(tab, isOwnProfile) {
  const subject = isOwnProfile ? "bạn" : "người dùng này";
  switch (tab) {
    case "followers":
      return {
        icon: IoPeopleOutline,
        title: "Follower",
        description: `Khi ai đó follow ${subject}, bạn sẽ thấy họ ở đây.`,
      };
    case "friends":
      return {
        icon: IoPeopleOutline,
        title: "Bạn bè",
        description: isOwnProfile
          ? "Khi bạn có follower follow lại bạn, bạn sẽ thấy họ ở đây."
          : "Khi người dùng này có các kết nối follow lẫn nhau, bạn sẽ thấy họ ở đây.",
      };
    case "suggested":
      return {
        icon: IoSparklesOutline,
        title: "Được đề xuất",
        description: isOwnProfile
          ? "Các tài khoản mà chúng tôi thấy phù hợp với bạn sẽ xuất hiện ở đây."
          : "Các tài khoản nên follow sẽ xuất hiện ở đây.",
      };
    case "following":
    default:
      return {
        icon: IoPersonOutline,
        title: "Đã follow",
        description: isOwnProfile
          ? "Khi bạn bắt đầu follow người khác, bạn sẽ nhìn thấy họ ở đây."
          : "Khi người dùng này bắt đầu follow người khác, bạn sẽ nhìn thấy họ ở đây.",
      };
  }
}

function FollowEmptyState({ tab, isOwnProfile }) {
  const { icon: Icon, title, description } = emptyStateContent(tab, isOwnProfile);
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/3 text-zinc-200">
        <Icon className="text-5xl" aria-hidden />
      </span>
      <p className="text-[28px] font-bold text-white">{title}</p>
      <p className="mt-2 max-w-[320px] text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function FollowListRow({
  item,
  token,
  activeTab,
  busy,
  onToggleFollow,
  onClose,
}) {
  const name =
    String(item?.displayName ?? item?.username ?? "Người dùng Vibely").trim() ||
    "Người dùng Vibely";
  const handleFollowClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    void onToggleFollow(item);
  };

  return (
    <Link
      to={buildProfileHref(item?.username)}
      onClick={onClose}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5"
    >
      <img
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        src={String(item?.avatarUrl ?? "").trim() || DEFAULT_AVATAR_URL}
        alt=""
        onError={(e) => {
          e.currentTarget.src = DEFAULT_AVATAR_URL;
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-zinc-400">@{item?.username ?? "-"}</p>
      </div>
      {token && !item?.self ? (
        <button
          type="button"
          disabled={busy}
          onClick={handleFollowClick}
          className={`min-w-[96px] rounded-lg px-3 py-2 text-sm font-semibold transition ${
            item?.followedByViewer
              ? "border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              : "bg-[#FE2C55] text-white hover:bg-[#ea284f]"
          } ${busy ? "cursor-wait opacity-70" : "cursor-pointer"}`}
        >
          {busy
            ? "Đang lưu..."
            : item?.followedByViewer
              ? "Đã follow"
              : activeTab === "followers" || activeTab === "suggested"
                ? "Follow lại"
                : "Follow"}
        </button>
      ) : null}
    </Link>
  );
}

export function ProfileFollowListModal({
  open,
  onClose,
  username,
  displayName,
  activeTab,
  onTabChange,
  followingCount = 0,
  followerCount = 0,
  token,
  onRequireLogin,
  isOwnProfile = false,
}) {
  const usernameKey = useMemo(() => normalizeUsernameKey(username), [username]);
  const [lists, setLists] = useState(() => ({
    followers: createListState(),
    following: createListState(),
  }));

  const derivedLists = useMemo(() => {
    const followers = lists.followers;
    const following = lists.following;
    const followingIds = new Set(
      following.items.map((item) => Number(item?.id ?? 0)).filter(Boolean),
    );
    const followerIds = new Set(
      followers.items.map((item) => Number(item?.id ?? 0)).filter(Boolean),
    );
    const friends = followers.items.filter((item) =>
      followingIds.has(Number(item?.id ?? 0)),
    );
    const suggested = followers.items.filter(
      (item) => !followingIds.has(Number(item?.id ?? 0)),
    );
    const busyIds = mergeBusyIds(followers.busyIds, following.busyIds);
    const derivedMeta = {
      loaded: followers.loaded && following.loaded,
      loading:
        (!followers.loaded && followers.loading) ||
        (!following.loaded && following.loading),
      loadingMore: followers.loadingMore || following.loadingMore,
      error: followers.error || following.error,
      usernameKey,
      busyIds,
    };
    return {
      friends: buildDerivedList(
        { usernameKey, busyIds },
        friends.filter((item) => followerIds.has(Number(item?.id ?? 0))),
        derivedMeta,
      ),
      suggested: buildDerivedList({ usernameKey, busyIds }, suggested, derivedMeta),
    };
  }, [lists.followers, lists.following, usernameKey]);

  const activeList =
    activeTab === "friends" || activeTab === "suggested"
      ? derivedLists[activeTab]
      : lists[activeTab] ?? EMPTY_LIST_STATE;

  const tabCounts = useMemo(
    () => ({
      following: Number(followingCount ?? 0),
      followers: Number(followerCount ?? 0),
      friends: derivedLists.friends.items.length,
      suggested: derivedLists.suggested.items.length,
    }),
    [derivedLists.friends.items.length, derivedLists.suggested.items.length, followerCount, followingCount],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    setLists({
      followers: createListState(),
      following: createListState(),
    });
  }, [usernameKey]);

  const fetchListPage = useCallback(
    async (tab, page, append = false) => {
      if (!usernameKey) return;
      setLists((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: !append,
          loadingMore: append,
          error: "",
          usernameKey,
        },
      }));
      try {
        const loader =
          tab === "followers"
            ? apiClient.getProfileFollowers
            : apiClient.getProfileFollowing;
        const data = await loader(usernameKey, {
          page,
          size: FOLLOW_LIST_PAGE_SIZE,
          token,
        });
        const incomingItems = Array.isArray(data?.items) ? data.items : [];
        setLists((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            items: append ? [...prev[tab].items, ...incomingItems] : incomingItems,
            page: Number(data?.page ?? page),
            hasNext: Boolean(data?.hasNext),
            loaded: true,
            loading: false,
            loadingMore: false,
            error: "",
            usernameKey,
          },
        }));
      } catch (error) {
        setLists((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            loading: false,
            loadingMore: false,
            error: error?.message || "Không thể tải danh sách follow.",
            usernameKey,
          },
        }));
      }
    },
    [token, usernameKey],
  );

  useEffect(() => {
    if (!open || !usernameKey) return;
    if (!lists.following.loaded && !lists.following.loading) {
      void fetchListPage("following", 0, false);
    }
    if (!lists.followers.loaded && !lists.followers.loading) {
      void fetchListPage("followers", 0, false);
    }
  }, [
    fetchListPage,
    lists.followers.loaded,
    lists.followers.loading,
    lists.following.loaded,
    lists.following.loading,
    open,
    usernameKey,
  ]);

  const handleLoadMore = useCallback(() => {
    if (!activeList.hasNext || activeList.loading || activeList.loadingMore) return;
    void fetchListPage(activeTab, Number(activeList.page ?? 0) + 1, true);
  }, [activeList.hasNext, activeList.loading, activeList.loadingMore, activeList.page, activeTab, fetchListPage]);

  const handleToggleFollow = useCallback(
    async (item) => {
      const userId = Number(item?.id ?? 0);
      if (!userId) return;
      if (!token) {
        onRequireLogin?.();
        return;
      }
      if (item?.self) return;
      const nextFollowedState = !Boolean(item?.followedByViewer);
      setLists((prev) => applyBusyState(updateFollowStateInLists(prev, userId, nextFollowedState), userId, true));
      try {
        if (nextFollowedState) {
          await apiClient.follow(userId, token);
        } else {
          await apiClient.unfollow(userId, token);
        }
        setLists((prev) => applyBusyState(prev, userId, false));
      } catch {
        setLists((prev) => applyBusyState(updateFollowStateInLists(prev, userId, !nextFollowedState), userId, false));
      }
    },
    [onRequireLogin, token],
  );

  if (!open || !usernameKey) return null;

  return (
    <div
      className="fixed inset-0 z-130 flex items-center justify-center bg-black/60 px-4 py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-follow-list-title"
        className="flex h-[min(78vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#1f1f1f] text-zinc-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative border-b border-white/10 px-6 pb-4 pt-5">
          <h2 id="profile-follow-list-title" className="truncate pr-10 text-2xl font-bold text-white">
            {displayName || usernameKey}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh sách follow"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <IoClose className="text-2xl" aria-hidden />
          </button>
          <div className="mt-4 grid w-full grid-cols-4 items-stretch border-b border-white/10 text-[12px] text-zinc-400 sm:text-[13px]">
            {FOLLOW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`flex min-w-0 items-center justify-center gap-1 px-1 pb-3 text-center leading-tight transition ${
                  activeTab === tab.id
                    ? "border-b border-white text-white"
                    : "hover:text-zinc-200"
                }`}
              >
                <span className="truncate max-w-full whitespace-nowrap">{tab.label}</span>
                {tab.id !== "suggested" ? <span className="whitespace-nowrap">{tabCounts[tab.id] ?? 0}</span> : null}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {activeList.loading ? (
            <div className="flex h-full items-center justify-center px-4 py-12 text-sm text-zinc-400">
              Đang tải danh sách...
            </div>
          ) : activeList.error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-zinc-300">{activeList.error}</p>
              <button
                type="button"
                onClick={() => void fetchListPage(activeTab, 0, false)}
                className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Thử lại
              </button>
            </div>
          ) : activeList.items.length === 0 ? (
            <FollowEmptyState tab={activeTab} isOwnProfile={isOwnProfile} />
          ) : (
            <div className="space-y-1">
              {activeList.items.map((item) => (
                <FollowListRow
                  key={`${activeTab}-${item.id ?? item.username}`}
                  item={item}
                  token={token}
                  activeTab={activeTab}
                  busy={Boolean(activeList.busyIds?.[item.id])}
                  onToggleFollow={handleToggleFollow}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {activeList.items.length > 0 &&
        (activeTab === "following" || activeTab === "followers") ? (
          <div className="border-t border-white/10 px-5 py-4">
            {activeList.hasNext ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={activeList.loadingMore}
                className="w-full rounded-full bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-70"
              >
                {activeList.loadingMore ? "Đang tải thêm..." : "Tải thêm"}
              </button>
            ) : (
              <p className="text-center text-xs text-zinc-500">Đã hiển thị hết danh sách.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
