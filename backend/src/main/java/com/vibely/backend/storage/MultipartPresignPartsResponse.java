package com.vibely.backend.storage;

import java.util.List;

public class MultipartPresignPartsResponse {

    private final List<MultipartPresignedPart> parts;
    private final long expiresAtEpochMillis;

    public MultipartPresignPartsResponse(List<MultipartPresignedPart> parts, long expiresAtEpochMillis) {
        this.parts = parts;
        this.expiresAtEpochMillis = expiresAtEpochMillis;
    }

    public List<MultipartPresignedPart> getParts() {
        return parts;
    }

    public long getExpiresAtEpochMillis() {
        return expiresAtEpochMillis;
    }
}
