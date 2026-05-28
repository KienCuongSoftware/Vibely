# Moderation Pipeline

## 1. Overview

Users report videos/comments; moderators review and action content. Schema supports moderation status on videos (V2).

## 2. Purpose

Platform safety and regulatory compliance.

## 3. Architecture

```
POST /api/videos/{id}/report
  → report record
  → queue for human review (roadmap: moderation_queues table)
  → action: hide video, strike user, dismiss
```

## 4. Target state

- AI pre-filter (NSFW, violence) on upload frame samples
- Strike escalation: 1st warning → temp ban → perm
- Audit log immutable

## 5–15.

GDPR: export/delete user data. Performance: async AI scoring. Monitor: report volume, time-to-action. Tradeoff: auto-remove vs human review.
