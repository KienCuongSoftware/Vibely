package com.vibely.backend.video;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public final class VideoPhotoUrls {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> LIST = new TypeReference<>() {};

    private VideoPhotoUrls() {}

    public static List<String> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            List<String> urls = MAPPER.readValue(raw, LIST);
            return urls == null ? List.of() : urls.stream().filter(u -> u != null && !u.isBlank()).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    public static String stringify(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(urls);
        } catch (Exception ignored) {
            return null;
        }
    }
}
