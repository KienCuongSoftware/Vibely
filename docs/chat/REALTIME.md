# Chat Realtime Architecture

## 1. Overview

Direct messaging with **conversation list**, **message thread**, **read receipts** (partial), and **STOMP** push.

## 2. Purpose

Creator ↔ fan communication; video share via `__vshare__:{videoId}` prefix.

## 3. Architecture

**REST:**

- `GET/POST /api/chat/conversations`
- `GET/POST .../messages`
- `POST .../read`, `/accept`, `/reject`, `/delete`

**Realtime:**

- `ChatRealtimePublisher` after persist
- Client `chatSocket.js` subscribes `/user/queue/...`

## 4. Data model (V25–V27)

- `chat_conversations`, `chat_participants`, `chat_messages`
- `request_accepted_at` — message request flow
- `hidden_at` — per-user delete without deleting for peer

## 5. Sequence

Send message → DB insert → STOMP to recipient → UI optimistic update (client).

## 6–7.

Scale: partition messages by conversation_id; archive cold storage. Sticky WS sessions.

## 8–15.

Security: only participants read thread. Failures: WS disconnect reconnect. Monitor: delivery lag, send error rate.
