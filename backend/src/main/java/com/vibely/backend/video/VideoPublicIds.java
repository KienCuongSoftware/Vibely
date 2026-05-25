package com.vibely.backend.video;

import com.vibely.backend.common.BadRequestException;
import java.util.UUID;
import java.util.regex.Pattern;

/** Parse and validate public video identifiers exposed in URLs and APIs. */
public final class VideoPublicIds {

    private static final Pattern NUMERIC_ONLY = Pattern.compile("^\\d+$");

    private VideoPublicIds() {}

    public static UUID parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Thiếu mã video");
        }
        String trimmed = raw.trim();
        if (NUMERIC_ONLY.matcher(trimmed).matches()) {
            throw new BadRequestException("Mã video không hợp lệ");
        }
        try {
            return UUID.fromString(trimmed);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Mã video không hợp lệ");
        }
    }
}
