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
| `/messages` | MessagesPage | Required |
| `/explore` | ExplorePage | Optional |
| `/login` | LoginPage | Public |
| `/@:username` | ProfilePage | Optional |

## 4. System Design

- `AuthProvider` wraps app — `token`, `refreshToken`, `user`, `authReady`
- `useAuth()` hook for login/logout/register
- Protected routes wait for `authReady` before API calls

## 5–15.

Zustand reserved for future global UI state (upload queue, player). Tradeoff: Context re-renders vs colocated state. Future: split AuthContext from User profile cache.
