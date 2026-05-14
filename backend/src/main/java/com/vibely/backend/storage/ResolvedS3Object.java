package com.vibely.backend.storage;

/** Bucket + object key parsed from a stored playback URL. */
public record ResolvedS3Object(String bucket, String key) {}
