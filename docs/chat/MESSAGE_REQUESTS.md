# Message Requests

## 1. Overview

Non-friends can send **one** message until the recipient accepts (V26).

## 2. Purpose

Reduce spam while allowing creator discovery.

## 3. Flow

```
User A messages User B (no prior accepted thread)
  → conversation flagged request
  → B sees "Message request"
  → POST /accept or /reject
  → on accept: canSendMessage=true for both
```

## 4. API flags

DTO includes `canSendMessage`, `canAcceptMessageRequest` for UI gating.

## 5–15.

Edge cases: duplicate direct convos deduped in list; hide conversation does not unhide on new message from profile. Future: paid DM, business inbox.
