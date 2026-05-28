# Telemetry & Abuse Detection

## 1. Overview

`CompositeAntiBotTelemetryPublisher` → `AbuseRulesEngine` → logging + optional Kafka.

## 2. Purpose

Async abuse signal processing without blocking API.

## 3. Topics

`login-events`, `captcha-events`, `risk-events`, `behavior-events`, `abuse-events`, `interaction-events`.

## 4. Rules (inline)

- Login failure spike → credential stuffing signal
- Captcha fail → device abuse
- Risk > 75 → session flag
- Suspicious behavior → automation_detected

## 5–15.

Enable Kafka: `app.antibot.kafka-enabled=true`. Future: Flink aggregation, auto-ban workflows. See [GRAFANA.md](GRAFANA.md).
