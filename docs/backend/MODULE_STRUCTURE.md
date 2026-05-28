# Backend Module Structure (DDD Boundaries)

## 1. Overview

Packages align to business capabilities. Each module owns entities, repositories, services, and controllers (where applicable).

## 2. Purpose

Clear ownership and extraction seams.

## 3. Architecture

| Module | Key classes | Tables / assets |
|--------|-------------|-----------------|
| `auth` | AuthService, JwtService, OAuth2* | users, refresh_tokens, otp |
| `video` | VideoService, VideoController | videos, views |
| `feed` | FeedController, FeedCursorCodec | (queries videos) |
| `explore` | ExploreService, ranking | explore_* |
| `chat` | ChatService, ChatRealtimePublisher | chat_* |
| `interaction` | InteractionService | likes, comments, follows |
| `processing` | FfmpegHlsPipelineRunner | processing jobs |
| `storage` | S3PresignedUploadService | S3 |
| `share` | ShareService, Redis* | share links |
| `antibot` | RiskEngine, CaptchaService, AuthProtectionService | anti_bot_* |
| `studio` | StudioAnalyticsController | aggregates |
| `user` | UserController | users |

## 4–6. Design & flows

Controllers are thin; business rules in services. Cross-module calls: `auth` ← `antibot` guard, `video` → `processing` enqueue.

## 7. Scaling

Extract `processing`, `chat`, `antibot` first under load.

## 8–15.

Standard non-functional requirements per [architecture/SYSTEM_OVERVIEW.md](../architecture/SYSTEM_OVERVIEW.md).
