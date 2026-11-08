package com.vibely.backend.places;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class NominatimPlacesSearchService {

    private static final int MAX_LIMIT = 8;
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final int CACHE_MAX = 200;

    private final RestClient restClient;
    private final boolean enabled;
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public NominatimPlacesSearchService(
        RestClient.Builder builder,
        @Value("${app.geocoding.nominatim-enabled:true}") boolean enabled
    ) {
        this.restClient = builder.defaultHeader("User-Agent", "Vibely/1.0 places-search").build();
        this.enabled = enabled;
    }

    public List<PlaceSuggestionResponse> search(String query, int limit) {
        String q = query == null ? "" : query.trim();
        if (!enabled || q.length() < 2) {
            return List.of();
        }
        int capped = Math.min(Math.max(limit, 1), MAX_LIMIT);
        String cacheKey = q.toLowerCase(Locale.ROOT) + "|" + capped;
        CacheEntry hit = cache.get(cacheKey);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.results();
        }

        URI uri = UriComponentsBuilder
            .fromUriString("https://nominatim.openstreetmap.org/search")
            .queryParam("format", "jsonv2")
            .queryParam("q", q)
            .queryParam("limit", capped)
            .queryParam("addressdetails", 1)
            .queryParam("accept-language", "vi,en")
            .queryParam("countrycodes", "vn")
            .build()
            .encode()
            .toUri();

        List<PlaceSuggestionResponse> results;
        try {
            JsonNode root = restClient.get()
                .uri(uri)
                .retrieve()
                .body(JsonNode.class);
            results = mapResults(root, capped);
        } catch (RuntimeException ex) {
            results = List.of();
        }

        if (cache.size() >= CACHE_MAX) {
            cache.clear();
        }
        cache.put(cacheKey, new CacheEntry(results, Instant.now().plus(CACHE_TTL)));
        return results;
    }

    private List<PlaceSuggestionResponse> mapResults(JsonNode root, int capped) {
        if (root == null || !root.isArray()) {
            return List.of();
        }
        List<PlaceSuggestionResponse> out = new ArrayList<>(Math.min(root.size(), capped));
        for (JsonNode node : root) {
            if (out.size() >= capped) {
                break;
            }
            PlaceSuggestionResponse mapped = mapOne(node);
            if (mapped != null) {
                out.add(mapped);
            }
        }
        return List.copyOf(out);
    }

    private PlaceSuggestionResponse mapOne(JsonNode node) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        String name = text(node, "name");
        String display = text(node, "display_name");
        if (name == null || name.isBlank()) {
            name = firstSegment(display);
        }
        if (name == null || name.isBlank()) {
            return null;
        }
        String address = addressLine(node.path("address"), display, name);
        String placeId = text(node, "place_id");
        if (placeId == null) {
            String osmType = text(node, "osm_type");
            String osmId = text(node, "osm_id");
            if (osmType != null && osmId != null) {
                placeId = osmType + ":" + osmId;
            }
        }
        Double lat = parseDouble(text(node, "lat"));
        Double lng = parseDouble(text(node, "lon"));
        return new PlaceSuggestionResponse(placeId, truncate(name, 180), truncate(address, 400), lat, lng);
    }

    private String addressLine(JsonNode address, String display, String name) {
        if (address != null && address.isObject()) {
            List<String> parts = new ArrayList<>();
            for (String key : List.of(
                "road",
                "suburb",
                "neighbourhood",
                "quarter",
                "village",
                "town",
                "city",
                "city_district",
                "county",
                "state",
                "country"
            )) {
                String value = text(address, key);
                if (value != null && !value.equalsIgnoreCase(name) && !parts.contains(value)) {
                    parts.add(value);
                }
            }
            if (!parts.isEmpty()) {
                return String.join(", ", parts);
            }
        }
        if (display == null || display.isBlank()) {
            return null;
        }
        if (display.startsWith(name)) {
            String rest = display.substring(name.length()).replaceFirst("^[,\\s]+", "").trim();
            return rest.isEmpty() ? null : rest;
        }
        return display;
    }

    private static String firstSegment(String display) {
        if (display == null || display.isBlank()) {
            return null;
        }
        int comma = display.indexOf(',');
        return comma > 0 ? display.substring(0, comma).trim() : display.trim();
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        String value = node.path(field).asText("");
        return value.isBlank() ? null : value.trim();
    }

    private static Double parseDouble(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private record CacheEntry(List<PlaceSuggestionResponse> results, Instant expiresAt) {
    }
}
