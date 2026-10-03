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

## Manual test checklist

1. Host signs in, creates a LIVE, grants camera/mic, sees the local preview, starts the LIVE.
2. A second browser (another account) opens the LIVE and sees and hears it.
3. Host toggles camera and mic: the viewer's video freezes/black and the audio goes silent, then both come back.
4. Viewer closes the tab: the viewer count drops.
5. Host goes offline briefly: viewers see "host reconnecting"; back within the grace, the LIVE continues.
6. Host ends the LIVE: viewers get `LIVE_ENDED`, and playback of the ended LIVE is refused.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| WHIP/WHEP succeed but the peer never connects | 8000/udp+tcp open on all firewalls (hPanel synced), `CANDIDATE` = public IPv4 |
| `on_publish` rejected | hook token mismatch between `vibely.env` and `srs.env`, or an expired/reused credential |
| LIVE ends ~60 s after host leaves | expected: reconnect grace elapsed |
