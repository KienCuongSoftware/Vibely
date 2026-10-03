# LIVE streaming (WebRTC + SRS)

Real-time LIVE video for Vibely. Media flows **browser → SRS → browser** over WebRTC; the Spring Boot
backend never receives or relays video. It only authenticates users, authorizes publish/play, owns the
LIVE lifecycle, and runs chat, likes and viewer counts (PostgreSQL, Redis, STOMP).

```
Host browser ──WHIP (SDP, HTTPS)──▶ nginx /rtc/v1/whip/ ──▶ SRS :1985 (127.0.0.1)
     │                                                        │  on_publish / on_play hooks
     └──────────── RTP over DTLS/SRTP, 8000/udp (tcp fallback) ┤──▶ backend /api/internal/live/media/srs-hooks
Viewer browser ◀──────────────────────────────────────────────┘
Viewer browser ──WHEP (SDP, HTTPS)──▶ nginx /rtc/v1/whep/ ──▶ SRS :1985
```

## Components

| Layer | Code |
|-------|------|
| SRS config | `deploy/srs/srs.conf` (SRS **v6.0-r1**, image `ossrs/srs:v6.0-r1`) |
| Backend media control | `backend/.../live/media/` — `LiveMediaService` → `SrsLiveMediaService` → `SrsClient` (`HttpSrsClient`) |
| Hook authorization | `LiveMediaHookController` + `LiveMediaHookService` (fail closed on `on_publish` / `on_play`) |
| Host disconnect / publish timeout | `LiveMediaHealthScheduler` |
| Frontend publisher | `frontend/src/features/live/media/webrtc/webrtcHostMediaController.js` (behind `media/hostMediaController.js`) |
| Frontend player | `media/webrtc/webrtcPlaybackController.js`, rendered by `components/player/WebRtcLivePlayer.jsx` (behind `LivePlayer.jsx`) |
| Connection states | `media/connectionState.js` — `CONNECTING`, `CONNECTED`, `DISCONNECTED`, `RECONNECTING`, `FAILED`, `ENDED` |

SRS APIs used (v6): WHIP `POST/DELETE /rtc/v1/whip/?app=&stream=`, WHEP `POST/DELETE /rtc/v1/whep/?app=&stream=`,
HTTP API `GET /api/v1/streams`, `GET /api/v1/clients`, `DELETE /api/v1/clients/{id}`, and HTTP hooks
`on_publish`, `on_unpublish`, `on_play`, `on_stop`.

## Flows

**Start.** `POST /api/lives` creates the LIVE (`CREATED`). `POST /api/lives/{id}/start` (host only,
`CREATED → LIVE`; any other transition is rejected) creates the media session with a random stream name.

**Publish.** For every connection attempt the host calls `POST /api/lives/{id}/publish-credential`
(host only, LIVE must be `LIVE`). The backend rotates a random single-use token, stores only its hash and
an expiry, and returns the WHIP URL. SRS calls `on_publish`; the backend accepts only the current,
unexpired token for that stream, then marks the session `PUBLISHING` and broadcasts `STREAM_STATE_UPDATED`.
The credential is never part of `LiveResponse` and is never logged.

**Playback.** Signed-in viewers call `GET /api/lives/{id}/playback`. Access rules (visibility, bans,
followers/friends) are checked first. When the host is publishing, the response holds a short-lived HMAC
playback token bound to the session and viewer. SRS calls `on_play`; the backend verifies the token.
Viewers never receive publish credentials.

**Viewer count.** Counting happens on the `on_play` hook (playback actually established), not on page
open. Each SRS client id is registered once per viewer key (`u{userId}`); `on_stop` removes it. Repeated
joins/leaves are idempotent, the host is not counted, and counts never go below zero.

**End.** `POST /api/lives/{id}/end` (host only) marks the LIVE `ENDED`, revokes the media session (hooks
reject any further publish/play), kicks every SRS client of the stream, cleans Redis state and broadcasts
`LIVE_ENDED`. When SRS is unreachable the business state is still committed; the session stays flagged and
cleanup is retried by the scheduler.

**Host disconnect.** When SRS reports the stream gone (`on_unpublish`, or STUN timeout after a crash, sleep
or network loss), viewers see "host reconnecting" and the LIVE stays `LIVE` for
`LIVE_MEDIA_RECONNECT_GRACE_SECONDS`. A new publish within the grace resumes the LIVE; otherwise it ends
with reason `host_disconnected`. A LIVE whose host never publishes ends after
`LIVE_MEDIA_PUBLISH_START_TIMEOUT_SECONDS` (`publish_timeout`).

**Client reconnect.** Host and viewer peers reconnect on `failed`/`closed`, or on `disconnected` lasting
longer than a short grace. Backoff is 1 s, 2 s, 4 s, 8 s, 16 s (capped), at most
`LIVE_MEDIA.RECONNECT_MAX_ATTEMPTS` attempts, then a manual retry. The previous peer and its SRS
session are always torn down first, so there is never more than one `RTCPeerConnection` per controller.

Chat (STOMP) and media (WebRTC) are independent: either keeps working when the other drops.

## Ports

| Port | Exposure | Purpose |
|------|----------|---------|
| 443/tcp (80 → redirect) | public | HTTPS site, API, WHIP/WHEP signaling via nginx |
| **8000/udp** | **public** | WebRTC media |
| **8000/tcp** | **public** | WebRTC over TCP fallback |
| 1985/tcp | 127.0.0.1 only | SRS HTTP API + WHIP/WHEP (reached by nginx and backend) |
| 1935/tcp | 127.0.0.1 only | RTMP (unused) |
| 8080/tcp | 127.0.0.1 only | Backend (nginx + SRS hooks) |
| 5432, 6379 | 127.0.0.1 only | PostgreSQL, Redis |

Open exactly 8000/udp and 8000/tcp for LIVE on **every** firewall in front of the VPS. On Hostinger this
includes the hPanel firewall (separate from `ufw`); rules must be **synced** after editing. Cloudflare
cannot proxy WebRTC media, so `CANDIDATE` must be the server's real public IPv4.

## Configuration

Backend (`application.yaml`, `live.media.*`; production values in `/opt/vibely/vibely.env`, template
`deploy/vps/live-media.env.example`):

| Variable | Local | Production |
|----------|-------|------------|
| `LIVE_MEDIA_ENABLED` | `true` to test video (default `false` = mock player) | `true` |
| `LIVE_MEDIA_API_URL` | `http://127.0.0.1:1985` | `http://127.0.0.1:1985` |
| `LIVE_MEDIA_PUBLIC_URL` | empty (Vite proxies `/rtc`) | empty = same origin as the site |
| `LIVE_MEDIA_HOOK_TOKEN` | dev default | random 64 hex, same as in `srs.env`; the dev default is rejected in production |
| `LIVE_MEDIA_TOKEN_SECRET` | optional | random 64 hex |
| `LIVE_MEDIA_RECONNECT_GRACE_SECONDS` | 60 | 60 |
| `LIVE_MEDIA_PUBLISH_START_TIMEOUT_SECONDS` | 180 | 180 |
| `LIVE_MEDIA_PUBLISH_TOKEN_TTL_SECONDS` / `LIVE_MEDIA_PLAYBACK_TOKEN_TTL_SECONDS` | 300 / 120 | 300 / 120 |
| `LIVE_MEDIA_STUN_URLS`, `LIVE_MEDIA_TURN_URLS`, `LIVE_MEDIA_TURN_USERNAME`, `LIVE_MEDIA_TURN_CREDENTIAL` | empty | empty (no TURN deployed yet) |

SRS (`/opt/vibely/srs.env`, template `deploy/vps/srs.env.example`): `CANDIDATE`, `SRS_HTTP_API_LISTEN`,
`SRS_LISTEN`, `SRS_VHOST_HTTP_HOOKS_ON_*`. Without hook overrides SRS rejects every client.

Frontend: no media URL variable is needed. WHIP/WHEP URLs and ICE servers come from the backend per
request, and the playback type comes from `live.playback.type`.

### Local

```bash
docker compose --profile live up -d srs        # root docker-compose.yml, binds 127.0.0.1 only
# backend: LIVE_MEDIA_ENABLED=true LIVE_MEDIA_API_URL=http://127.0.0.1:1985
```

`http://localhost` is a secure context, so camera and WebRTC work there. To test from another device,
set `SRS_CANDIDATE` and `SRS_MEDIA_BIND` to the LAN IP and serve the site over HTTPS.

### Production

HTTPS is mandatory (`getUserMedia` and WebRTC need a secure context; STOMP uses `wss://`). Deploy the
`srs` service from `deploy/vps/docker-compose.yml` (host network, `restart: unless-stopped`), copy
`deploy/srs/srs.conf` to `/opt/vibely/srs/srs.conf`, and keep nginx forwarding only
`/rtc/v1/whip/` and `/rtc/v1/whep/`.

## NAT traversal

SRS has a public IP, so most clients connect directly (UDP, then TCP 8000). If a client on a
restrictive network cannot connect while others can, the cause is NAT/firewall traversal: add a TURN
server through `LIVE_MEDIA_TURN_*`. Do not change frontend code to work around it.

## Phase 4: recording, replay, HLS fallback, limits

Every Phase 4 feature is behind a backend flag that defaults to off. With the flags off, LIVE behaves
exactly as in Phase 3. `GET /api/lives/capabilities` tells the frontend what is enabled
(`media`, `recording`, `hlsFallback`, `maxDurationMinutes`, `maxReplaySeconds`).

### Recording → replay

```
SRS (rtc_to_rtmp + DVR, plan session) ── one FLV per publish ──▶ /var/lib/vibely/live-dvr (host disk)
      │ on_dvr hook (cwd, file)
      ▼
backend LiveRecordingService ── LIVE ended + settle delay ──▶ LiveRecordingWorker (1 thread, FFmpeg remux/concat)
      ──▶ S3 uploads/{hostId}/live-{livePublicId}.mp4 ──▶ existing video pipeline (draft, host-only video)
```

- The host opts in when creating the LIVE (`recordingEnabled`; the toggle only shows when
  `capabilities.recording`). Without `LIVE_RECORDING_ENABLED=true` and S3, the flag is ignored.
- Starting the LIVE creates a `live_recordings` row (`RECORDING`). Each `on_dvr` adds a
  `live_recording_segments` row. The hook is idempotent (unique file path) and only accepts files
  inside `LIVE_RECORDING_DVR_DIR`. Files of LIVEs that did not opt in are deleted right away.
- After the LIVE ends and `LIVE_RECORDING_SETTLE_SECONDS` have passed, the worker concatenates the
  segments with FFmpeg (stream copy, capped at `LIVE_RECORDING_MAX_REPLAY_SECONDS`), uploads the MP4
  and creates a **draft video owned by the host** through the normal video pipeline.
  The status goes `PROCESSING` → `READY` when the pipeline finishes. `FAILED` happens after
  `LIVE_RECORDING_MAX_ATTEMPTS` attempts or when processing times out.
- Recording never affects the LIVE: hook and worker errors are logged and retried, and ending a LIVE
  never waits for them.
- `GET /api/lives/{id}/replay` returns the status and, once ready, a short-lived presigned playback URL.
  It is visible to the host always, and to others only after the host publishes the video from Studio.
  The response is `no-store`, URLs are never stored, and `404 REPLAY_NOT_FOUND` means there is no recording.
  The frontend page is `/replay/:liveId`.
- Unclaimed DVR files are removed after `LIVE_RECORDING_ORPHAN_FILE_RETENTION_HOURS`. Only one backend
  instance (the one sharing the DVR directory with SRS) should run with recording on.

### HLS fallback

- SRS also writes HLS (`hls_fragment 2`, `hls_window 12`, cleanup on) to `/var/lib/vibely/live-hls`. Host
  nginx serves it at `/live-hls/`. Video never goes through the backend and the S3 bucket stays private.
- `GET /api/lives/{id}/playback` adds `hlsUrl` (playlist + an HMAC token scoped to that stream, TTL
  `LIVE_HLS_TOKEN_TTL_SECONDS`). WHEP tokens and HLS tokens cannot be used for each other.
- nginx checks every playlist request with `auth_request` → `GET /api/live-media/hls-auth`. The check
  needs a valid token for that stream and an open media session (publishing or interrupted). Segments
  are only listed in an authorized playlist and SRS deletes them shortly afterwards.
- The player switches to HLS **once**: after `HLS_FALLBACK_AFTER_ATTEMPTS` (3) failed WebRTC
  reconnects, or straight away when the browser has no WebRTC. A fatal HLS error ends in `failed`;
  the manual retry starts over with WebRTC. Nothing switches automatically in the other direction, so
  the player cannot loop. HLS viewers are not counted in the viewer count (it is driven by `on_play`).

### Other Phase 4 behaviour

- **Interrupted UI.** While the host's media is down (grace period), playback reports `interrupted` and
  viewers see "the LIVE is having connection problems".
- **Screen share.** The host can share a screen, window or tab instead of the camera (`getDisplayMedia`,
  same sender, `replaceTrack`, no renegotiation). The browser's "Stop sharing" switches back to the camera.
- **Connection quality.** Shown on the host page and in the viewer room: three bars computed from
  `RTCPeerConnection.getStats()` every 2 s (loss, RTT, bitrate). Nothing is sent to the server.
- **Analytics.** `live_analytics` is written once when a LIVE ends (duration, unique viewers, watch
  time, peak/average viewers, likes, comments, reconnects, end reason). `GET /api/lives/{id}/analytics`
  is host-only and only available after the end; the host's end screen shows it.
- **Max duration.** `LiveLimitsScheduler` ends LIVEs older than `LIVE_MAX_DURATION_MINUTES`
  (end reason `max_duration`; idempotent, safe on several nodes).

### Enabling on the VPS

1. Directories (the backend container runs as a non-root user and must delete DVR files):
   ```bash
   GID=$(docker exec vibely-backend id -g)
   sudo install -d -m 2770 -g "$GID" /var/lib/vibely/live-dvr
   sudo install -d -m 0755 /var/lib/vibely/live-hls
   ```
2. `srs.env`: uncomment the Phase 4 block (`SRS_VHOST_RTC_RTC_TO_RTMP=on`, DVR and/or HLS) from
   `deploy/vps/srs.env.example`, using the same hook token.
3. `vibely.env`: `LIVE_RECORDING_ENABLED=true` and/or `LIVE_HLS_ENABLED=true` (see
   `deploy/vps/live-media.env.example`). Recording also needs S3.
4. Copy `deploy/srs/srs.conf` and the compose file, then add the `/live-hls/` block from
   `deploy/nginx/vibely.conf` (nginx needs `--with-http_auth_request_module`, which Ubuntu's package
   includes) and run `nginx -t && systemctl reload nginx`.
5. `docker compose up -d srs backend`.

Locally (Windows) the backend runs outside Docker, so the DVR path that SRS reports cannot be resolved.
Test recording and HLS on Linux/VPS.

## Manual test checklist

1. Host signs in, creates a LIVE, grants camera/mic, sees the local preview, starts the LIVE.
2. A second browser (another account) opens the LIVE and sees and hears it.
3. Host toggles camera and mic: the viewer's video freezes/black and the audio goes silent, then both come back.
4. Viewer closes the tab: the viewer count drops.
5. Host goes offline briefly: viewers see "host reconnecting"; back within the grace, the LIVE continues.
6. Host ends the LIVE: viewers get `LIVE_ENDED`, and playback of the ended LIVE is refused.
7. (Phase 4) Host shares a screen and stops it from the browser bar: viewers see the screen, then the camera.
8. (Recording on) Create a LIVE with "record replay", end it: the end screen shows stats and the replay
   goes RECORDING → PROCESSING → READY, then appears as a draft in Studio.
9. (HLS on) Block UDP+TCP 8000 for a viewer: after the reconnect attempts it plays over HLS ("HLS" badge).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| WHIP/WHEP succeed but the peer never connects | 8000/udp+tcp open on all firewalls (hPanel synced), `CANDIDATE` = public IPv4 |
| `on_publish` rejected | hook token mismatch between `vibely.env` and `srs.env`, or an expired/reused credential |
| LIVE ends ~60 s after host leaves | expected: reconnect grace elapsed |
| Replay stuck in RECORDING / no segments | `SRS_VHOST_RTC_RTC_TO_RTMP=on`, `SRS_VHOST_DVR_ENABLED=on`, `ON_DVR` hook URL set, same DVR path mounted in both containers |
| Replay FAILED, `AccessDeniedException` in backend logs | DVR directory group/permissions (step 1 above) |
| HLS playlist 403 | token expired or LIVE no longer open; `LIVE_HLS_ENABLED=true` on the backend |
| HLS playlist 404 | SRS HLS not enabled, or `LIVE_MEDIA_APP` is not `live` (nginx alias path) |
