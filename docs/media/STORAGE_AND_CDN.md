# Storage & CDN

## S3 layout

```
uploads/{userId}/{videoId}/source.mp4
hls/{userId}/{videoId}/master.m3u8
hls/{userId}/{videoId}/360p/segment_*.ts
thumbnails/{userId}/{videoId}/cover.jpg
```

## Presign policy

- Upload PUT: short TTL (minutes)
- Playback: CloudFront signed URL or public path per bucket policy

## Lifecycle

- Transition source to IA after 30d (roadmap)
- Delete aborted uploads after 7d

## CloudFront

- Origin: S3 OAI
- Cache behaviors: `.m3u8` short TTL, `.ts` long TTL
- CORS for hls.js segment fetch

## 10–15.

DR: cross-region replication. Security: block public ACLs. Cost: egress monitoring per TB.
