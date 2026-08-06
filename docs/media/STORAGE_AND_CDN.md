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
- Abort incomplete multipart uploads after 7d (bucket lifecycle rule recommended)

## CloudFront

- Origin: S3 OAI
- Cache behaviors: `.m3u8` short TTL, `.ts` long TTL
- CORS for hls.js segment fetch

## Upload CORS / IAM (multipart)

- Bucket CORS must allow `PUT` from SPA origins and **`ExposeHeaders: ["ETag"]`** (required for multipart complete in the browser).
- Upload IAM principal needs `s3:PutObject` and `s3:AbortMultipartUpload` on `uploads/*`.

## 10–15.

DR: cross-region replication. Security: block public ACLs. Cost: egress monitoring per TB.
