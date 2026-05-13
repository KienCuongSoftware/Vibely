# Vibely Audio Extract Pipeline (Lambda + MediaConvert)

This sample pipeline automatically creates `.mp3` from uploaded videos:

- input: `uploads/<userId>/<uuid>.mp4|.mov|.webm`
- output: `audios/<userId>/<uuid>.mp3`

## 1) Prerequisites

- S3 bucket used by Vibely uploads.
- MediaConvert role (for jobs), e.g. `MediaConvert_Default_Role`.
- Lambda execution role with permissions similar to `iam-policy.sample.json`.

## 2) Lambda env vars

Required:

- `S3_BUCKET=your-vibely-bucket`
- `MEDIACONVERT_ROLE_ARN=arn:aws:iam::<account-id>:role/MediaConvert_Default_Role`

Optional:

- `OUTPUT_BUCKET=your-vibely-bucket` (default = `S3_BUCKET`)
- `MEDIACONVERT_QUEUE_ARN=arn:aws:mediaconvert:...:queues/Default`
- `MEDIACONVERT_ENDPOINT=https://abcd1234.mediaconvert.ap-southeast-1.amazonaws.com`

If `MEDIACONVERT_ENDPOINT` is not set, the Lambda tries `DescribeEndpoints`.

## 3) Build + deploy

```bash
cd infra/lambda-audio-extract
npm install
npm run zip
```

Upload `dist.zip` to AWS Lambda, set handler:

- Runtime: `Node.js 20.x`
- Handler: `index.handler`

## 4) Configure S3 trigger

Create S3 Event Notification:

- Event type: `ObjectCreated:*`
- Prefix: `uploads/`
- Suffix: `.mp4` (add more triggers for `.mov`, `.webm`)
- Target: this Lambda

## 5) Link with Vibely backend/frontend

Vibely code already derives audio URL by convention:

- video URL: `.../uploads/<user>/<id>.mp4`
- audio URL: `.../audios/<user>/<id>.mp3`

So once MediaConvert writes `.mp3` to `audios/...`, the sound page and audio player work automatically.

