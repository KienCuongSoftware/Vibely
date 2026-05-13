import { MediaConvertClient, CreateJobCommand, DescribeEndpointsCommand } from "@aws-sdk/client-mediaconvert";

const VIDEO_EXT_RE = /\.(mp4|mov|webm)$/i;

function decodeS3Key(rawKey) {
  return decodeURIComponent(String(rawKey || "").replace(/\+/g, " "));
}

function toAudioKey(videoKey) {
  // uploads/<userId>/<file>.mp4 -> audios/<userId>/<file>.mp3
  const key = String(videoKey);
  const replacedPrefix = key.startsWith("uploads/") ? `audios/${key.slice("uploads/".length)}` : key;
  return replacedPrefix.replace(VIDEO_EXT_RE, ".mp3");
}

function shouldProcessKey(key) {
  return key.startsWith("uploads/") && VIDEO_EXT_RE.test(key);
}

async function resolveMediaConvertClient() {
  const region = process.env.AWS_REGION || "ap-southeast-1";
  const endpointFromEnv = process.env.MEDIACONVERT_ENDPOINT;
  if (endpointFromEnv && endpointFromEnv.trim()) {
    return new MediaConvertClient({ region, endpoint: endpointFromEnv.trim() });
  }

  // Fallback: discover account endpoint dynamically.
  const discoveryClient = new MediaConvertClient({ region });
  const endpoints = await discoveryClient.send(new DescribeEndpointsCommand({ MaxResults: 1 }));
  const endpoint = endpoints.Endpoints?.[0]?.Url;
  if (!endpoint) {
    throw new Error("Cannot resolve MediaConvert endpoint. Set MEDIACONVERT_ENDPOINT env var.");
  }
  return new MediaConvertClient({ region, endpoint });
}

export const handler = async (event) => {
  const bucket = process.env.S3_BUCKET;
  const roleArn = process.env.MEDIACONVERT_ROLE_ARN;
  const queueArn = process.env.MEDIACONVERT_QUEUE_ARN || undefined;
  const outputBucket = process.env.OUTPUT_BUCKET || bucket;

  if (!bucket || !roleArn) {
    throw new Error("Missing required env vars: S3_BUCKET, MEDIACONVERT_ROLE_ARN");
  }

  const mediaConvert = await resolveMediaConvertClient();
  const records = Array.isArray(event?.Records) ? event.Records : [];
  const results = [];

  for (const record of records) {
    const recordBucket = record?.s3?.bucket?.name;
    const rawKey = record?.s3?.object?.key;
    const sourceKey = decodeS3Key(rawKey);

    if (!recordBucket || !sourceKey) continue;
    if (recordBucket !== bucket) continue;
    if (!shouldProcessKey(sourceKey)) continue;

    const destinationKey = toAudioKey(sourceKey);
    const destinationPrefix = destinationKey.split("/").slice(0, -1).join("/") + "/";

    const inputUrl = `s3://${recordBucket}/${sourceKey}`;
    const destinationUrl = `s3://${outputBucket}/${destinationPrefix}`;

    const command = new CreateJobCommand({
      Role: roleArn,
      Queue: queueArn,
      Settings: {
        Inputs: [
          {
            FileInput: inputUrl,
            AudioSelectors: {
              "Audio Selector 1": {
                DefaultSelection: "DEFAULT"
              }
            }
          }
        ],
        OutputGroups: [
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: destinationUrl
              }
            },
            Outputs: [
              {
                ContainerSettings: {
                  Container: "RAW"
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "MP3",
                      Mp3Settings: {
                        Bitrate: 128000,
                        Channels: 2,
                        SampleRate: 44100,
                        RateControlMode: "CBR"
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      UserMetadata: {
        sourceKey,
        audioKey: destinationKey
      }
    });

    const response = await mediaConvert.send(command);
    results.push({
      sourceKey,
      audioKey: destinationKey,
      jobId: response.Job?.Id || null,
      status: response.Job?.Status || null
    });
  }

  return {
    processed: results.length,
    results
  };
};

