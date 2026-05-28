# Risk Engine

## 1. Overview

`RiskEngine` computes a 0–100 **risk score** from automation signals, IP reputation, trust scores, and velocity.

## 2. Purpose

Drive adaptive challenge level without hard-blocking legitimate users.

## 3. Architecture

**Inputs:** fingerprint, automation flags, device trust, user trust, IP reputation (WAF headers), rate limits.

**Outputs:** `RiskLevel`, `ChallengeLevel`, `challengeToken`, signal list.

## 4. Policy matrix

| Score | Level | Challenge |
|------:|-------|-----------|
| 0–24 | LOW | None |
| 25–49 | MEDIUM | Checkbox |
| 50–74 | HIGH | Rotate |
| 75–89 | VERY_HIGH | Slider |
| 90–100 | EXTREME | Multi-step |

**Bypass:** high trust + low failures + good IP → NONE.

## 5–15.

Persisted in `anti_bot_risk_events`. API: `POST /api/risk/evaluate`. Future: ML model shadow mode. Monitor: `antibot.risk.score` histogram.
