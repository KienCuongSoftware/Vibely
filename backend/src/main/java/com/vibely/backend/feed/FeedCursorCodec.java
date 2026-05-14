package com.vibely.backend.feed;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;

/**
 * Opaque cursor for keyset pagination of the public feed (ordered by {@code createdAt desc, id desc}).
 */
public final class FeedCursorCodec {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private FeedCursorCodec() {
    }

    public record Decoded(long id, LocalDateTime createdAt) {
    }

    public static String encode(LocalDateTime createdAt, long id) {
        if (createdAt == null) {
            throw new IllegalArgumentException("createdAt");
        }
        try {
            String json = MAPPER.writeValueAsString(
                Map.of("id", id, "t", ISO.format(createdAt))
            );
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("encode feed cursor", e);
        }
    }

    public static Decoded decode(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Cursor không hợp lệ.");
        }
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(raw.trim());
            @SuppressWarnings("unchecked")
            Map<String, Object> map = MAPPER.readValue(bytes, Map.class);
            Object idObj = map.get("id");
            Object tObj = map.get("t");
            if (!(idObj instanceof Number) || tObj == null) {
                throw new BadRequestException("Cursor không hợp lệ.");
            }
            long id = ((Number) idObj).longValue();
            LocalDateTime createdAt = LocalDateTime.parse(String.valueOf(tObj), ISO);
            return new Decoded(id, createdAt);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Cursor không hợp lệ.");
        }
    }
}
