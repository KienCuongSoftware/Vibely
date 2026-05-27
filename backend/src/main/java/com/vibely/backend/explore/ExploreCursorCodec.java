package com.vibely.backend.explore;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;

public final class ExploreCursorCodec {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private ExploreCursorCodec() {
    }

    public record Decoded(double score, LocalDateTime createdAt, long id) {
    }

    public static String encode(double score, LocalDateTime createdAt, long id) {
        try {
            String json = MAPPER.writeValueAsString(Map.of("s", score, "t", ISO.format(createdAt), "id", id));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("encode explore cursor", e);
        }
    }

    public static Decoded decode(String raw) {
        if (raw == null || raw.isBlank()) throw new BadRequestException("Cursor không hợp lệ.");
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(raw.trim());
            @SuppressWarnings("unchecked")
            Map<String, Object> map = MAPPER.readValue(bytes, Map.class);
            double score = ((Number) map.get("s")).doubleValue();
            LocalDateTime createdAt = LocalDateTime.parse(String.valueOf(map.get("t")), ISO);
            long id = ((Number) map.get("id")).longValue();
            return new Decoded(score, createdAt, id);
        } catch (Exception e) {
            throw new BadRequestException("Cursor không hợp lệ.");
        }
    }
}
