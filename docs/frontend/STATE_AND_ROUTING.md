# State Management & Routing

## 1. Overview

**React Router 7** for URL-driven navigation. **AuthContext** for session; feature state mostly local `useState` / `useReducer`.

## 2. Purpose

Share auth across protected routes without prop drilling.

## 3. Architecture

| Route | Page | Auth |
|-------|------|------|
| `/foryou` | FeedPage | Optional |
| `/following` | FollowingPage | Required |
| `/friends` | FriendsPage | Optional |
| `/messages` | MessagesPage | Required |
| `/explore` | ExplorePage | Optional |
| `/explore/view/:publicId` | ExploreViewerPage | Optional |
| `/search` | SearchResultsPage | Optional (`?q=` required for results) |
| `/tag/:tag` | HashtagPage | Optional |
| `/sound` | SoundPage | Optional |
| `/:username` | ProfilePage | Optional |
| `/:username/video/:publicId` | VideoWatchPage | Optional |
| `/profile` | ProfilePage (own) | Required |
| `/login` | LoginPage | Public |
| `/vibelystudio/*` | Studio pages | Required |

## 4. System Design

- `AuthProvider` wraps app — `token`, `refreshToken`, `user`, `authReady`
- `useAuth()` hook for login/logout/register
- Protected routes wait for `authReady` before API calls

## 5. Layout patterns

| Page | Scroll container |
|------|------------------|
| Explore, Search results, Profile | `h-dvh` shell + inner `scrollbar-none overflow-y-auto` (no visible vertical scrollbar) |
| For You / Following | Full-viewport feed (`VirtualizedFeed`) |
| Video watch | Sidebar tabs; creator grid uses hidden scrollbar when tab active |

## 6. Client-only profile UX

**Last watched** (`profileLastWatched.js`): `sessionStorage` key `vibely.profile.lastWatched.{username}` stores `{ publicId, tab, favoritesSubTab }`. Written from profile grid, For You feed, and watch page. Profile grid shows **Vừa xem** overlay and a floating scroll-to-tile control when the marker is off-screen.

## 7–15.

Zustand reserved for future global UI state (upload queue, player). Tradeoff: Context re-renders vs colocated state. Future: split AuthContext from User profile cache.

**Search UI:** [search/ARCHITECTURE.md](../search/ARCHITECTURE.md)
