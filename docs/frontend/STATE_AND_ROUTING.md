# State Management & Routing

## 1. Overview

**React Router 7** for URL-driven navigation. **AuthContext** (`store/`) for session; feature UI state mostly local `useState` / feature contexts (search modal, activity modal, chat badge, notification unread).

## 2. Purpose

Share auth across protected routes without prop drilling; keep domain state next to its feature.

## 3. Architecture

| Route | Page module | Auth |
|-------|-------------|------|
| `/foryou` | `features/feed/pages/FeedPage` | Optional |
| `/following` | `features/feed/pages/FollowingPage` | Required |
| `/friends` | `features/feed/pages/FriendsPage` | Optional |
| `/messages` | `features/chat/pages/MessagesPage` | Required |
| `/explore` | `features/explore/pages/ExplorePage` | Optional |
| `/explore/view/:publicId` | `features/explore/pages/ExploreViewerPage` | Optional |
| `/search` | `features/search/pages/SearchResultsPage` | Optional (`?q=` for results) |
| `/tag/:tag` | `features/post/pages/HashtagPage` | Optional |
| `/sound` | `features/post/pages/SoundPage` | Optional |
| `/:username` | `features/profile/pages/ProfilePage` | Optional |
| `/:username/video/:publicId` | `features/post/pages/PublicVideoDetailPage` | Optional |
| `/profile` | `features/profile/pages/ProfilePage` (own) | Required |
| `/login` | `features/auth/pages/LoginPage` | Public |
| `/vibelystudio/*` | `features/studio/pages/*`, `features/upload` | Required |
| `/admin/*` | `features/admin/pages/*` | Admin role |

Route trees: `app/routes.jsx` (`GuestRoutes`, `OnboardingRoutes`, `AuthenticatedRoutes`). Guards: `app/guards/AdminRoute.jsx`.

## 4. System Design

- `AuthProvider` in `app/providers/AppProviders.jsx` — `token`, `user`, `authReady`, …
- `useAuth()` from `store/useAuth.js`
- Protected flows wait for `authReady` before API calls
- Feature providers: `SearchModalProvider`, `ActivityModalProvider`, `NotificationUnreadProvider`, `ChatInboxBadgeProvider`

## 5. Layout patterns

| Page | Scroll container |
|------|------------------|
| Explore, Search results, Profile | `h-dvh` shell + inner `scrollbar-none overflow-y-auto` |
| For You / Following | Full-viewport feed (`VirtualizedFeed`) |
| Video watch | Sidebar tabs; creator grid uses hidden scrollbar when active |

## 6. Client-only profile UX

**Last watched** (`features/profile/utils/profileLastWatched.js`): `sessionStorage` key `vibely.profile.lastWatched.{username}` stores `{ publicId, tab, favoritesSubTab }`. Written from profile grid, For You feed, and watch. Profile shows **Vừa xem** overlay + scroll-to-tile when off-screen.

## 7–15.

Zustand reserved for future global UI state (upload queue, player). Tradeoff: Context re-renders vs colocated state.

**Search UI:** [search/ARCHITECTURE.md](../search/ARCHITECTURE.md)
