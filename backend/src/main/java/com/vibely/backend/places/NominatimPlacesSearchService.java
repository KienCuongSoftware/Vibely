package com.vibely.backend.places;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class NominatimPlacesSearchService {

    private static final int MAX_SEARCH_LIMIT = 12;
    private static final int MAX_NEARBY_LIMIT = 16;
    private static final double NEARBY_RADIUS_M = 3500;
    private static final double SEARCH_VIEWBOX_DEG = 0.18;
    private static final Duration CACHE_TTL = Duration.ofMinutes(8);
    private static final int CACHE_MAX = 250;

    private final RestClient restClient;
    private final boolean enabled;
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public NominatimPlacesSearchService(
        RestClient.Builder builder,
        @Value("${app.geocoding.nominatim-enabled:true}") boolean enabled
    ) {
        this.restClient = builder
            .defaultHeader("User-Agent", "Vibely/1.0 places-search")
            .build();
        this.enabled = enabled;
    }

    public List<PlaceSuggestionResponse> search(String query, int limit, Double lat, Double lng) {
        String q = query == null ? "" : query.trim();
        if (!enabled || q.length() < 2) {
            return List.of();
        }
        int capped = Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT);
        boolean hasBias = validCoord(lat, lng);
        String cacheKey = "s|"
            + q.toLowerCase(Locale.ROOT)
            + "|"
            + capped
            + "|"
            + (hasBias ? roundCoord(lat) + "," + roundCoord(lng) : "-");
        CacheEntry hit = cache.get(cacheKey);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.results();
        }

        UriComponentsBuilder builder = UriComponentsBuilder
            .fromUriString("https://nominatim.openstreetmap.org/search")
            .queryParam("format", "jsonv2")
            .queryParam("q", q)
            .queryParam("limit", capped)
            .queryParam("addressdetails", 1)
            .queryParam("accept-language", "vi,en")
            .queryParam("countrycodes", "vn");
        if (hasBias) {
            double minLon = lng - SEARCH_VIEWBOX_DEG;
            double maxLon = lng + SEARCH_VIEWBOX_DEG;
            double minLat = lat - SEARCH_VIEWBOX_DEG;
            double maxLat = lat + SEARCH_VIEWBOX_DEG;
            builder.queryParam(
                "viewbox",
                String.format(Locale.ROOT, "%f,%f,%f,%f", minLon, maxLat, maxLon, minLat)
            );
            builder.queryParam("bounded", 0);
        }

        List<PlaceSuggestionResponse> results;
        try {
            JsonNode root = restClient.get()
                .uri(builder.build().encode().toUri())
                .retrieve()
                .body(JsonNode.class);
            results = mapNominatimResults(root, capped);
            if (hasBias) {
                results = sortByDistance(results, lat, lng, capped);
            }
        } catch (RuntimeException ex) {
            results = List.of();
        }

        putCache(cacheKey, results);
        return results;
    }

    public List<PlaceSuggestionResponse> nearby(Double lat, Double lng, int limit) {
        if (!enabled || !validCoord(lat, lng)) {
            return List.of();
        }
        int capped = Math.min(Math.max(limit, 1), MAX_NEARBY_LIMIT);
        String cacheKey = "n|" + roundCoord(lat) + "," + roundCoord(lng) + "|" + capped;
        CacheEntry hit = cache.get(cacheKey);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.results();
        }

        Map<String, PlaceSuggestionResponse> merged = new LinkedHashMap<>();
        PlaceSuggestionResponse here = reverseAsPlace(lat, lng);
        if (here != null) {
            merged.put(dedupeKey(here), here);
        }
        for (PlaceSuggestionResponse place : overpassNearby(lat, lng, capped + 4)) {
            merged.putIfAbsent(dedupeKey(place), place);
            if (merged.size() >= capped) {
                break;
            }
        }
        if (merged.size() < Math.min(4, capped)) {
            for (PlaceSuggestionResponse place : nominatimAreaFallback(lat, lng, capped)) {
                merged.putIfAbsent(dedupeKey(place), place);
                if (merged.size() >= capped) {
                    break;
                }
            }
        }

        List<PlaceSuggestionResponse> results = sortByDistance(
            new ArrayList<>(merged.values()),
            lat,
            lng,
            capped
        );
        putCache(cacheKey, results);
        return results;
    }

    /**
     * Chip suggestions: nearby (GPS or IP coords) merged with curated VN POIs so the row
     * never collapses to only a few city names.
     */
    public List<PlaceSuggestionResponse> suggestions(Double lat, Double lng, int limit) {
        int capped = Math.min(Math.max(limit, 1), MAX_NEARBY_LIMIT);
        Map<String, PlaceSuggestionResponse> merged = new LinkedHashMap<>();
        if (validCoord(lat, lng)) {
            for (PlaceSuggestionResponse place : nearby(lat, lng, capped)) {
                merged.putIfAbsent(dedupeKey(place), place);
            }
            for (PlaceSuggestionResponse place : closestPopular(lat, lng, capped)) {
                merged.putIfAbsent(dedupeKey(place), place);
                if (merged.size() >= capped) {
                    break;
                }
            }
        } else {
            for (PlaceSuggestionResponse place : PopularPlacesCatalog.all()) {
                merged.putIfAbsent(dedupeKey(place), place);
                if (merged.size() >= capped) {
                    break;
                }
            }
        }
        return List.copyOf(merged.values().stream().limit(capped).toList());
    }

    private List<PlaceSuggestionResponse> closestPopular(double lat, double lng, int limit) {
        return PopularPlacesCatalog.all().stream()
            .sorted(Comparator.comparingDouble(p -> distanceMeters(lat, lng, p.lat(), p.lng())))
            .limit(limit)
            .toList();
    }

    private PlaceSuggestionResponse reverseAsPlace(double lat, double lng) {
        URI uri = UriComponentsBuilder
            .fromUriString("https://nominatim.openstreetmap.org/reverse")
            .queryParam("format", "jsonv2")
            .queryParam("lat", lat)
            .queryParam("lon", lng)
            .queryParam("zoom", 17)
            .queryParam("addressdetails", 1)
            .queryParam("accept-language", "vi,en")
            .build()
            .encode()
            .toUri();
        try {
            JsonNode root = restClient.get().uri(uri).retrieve().body(JsonNode.class);
            PlaceSuggestionResponse mapped = mapNominatimOne(root);
            if (mapped == null) {
                return null;
            }
            String name = mapped.name();
            if (name == null || name.isBlank()) {
                return null;
            }
            return new PlaceSuggestionResponse(
                mapped.placeId() != null ? mapped.placeId() : "here:" + roundCoord(lat) + "," + roundCoord(lng),
                truncate(name, 180),
                mapped.address(),
                lat,
                lng
            );
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private List<PlaceSuggestionResponse> overpassNearby(double lat, double lng, int limit) {
        String ql = """
            [out:json][timeout:12];
            (
              node(around:%f,%f,%f)[name][amenity~"^(cafe|restaurant|fast_food|bar|pub|cinema|theatre|library|university|college|school|hospital|clinic|bank|marketplace|place_of_worship)$"];
              node(around:%f,%f,%f)[name][tourism~"^(attraction|museum|hotel|guest_house|viewpoint|zoo|theme_park)$"];
              node(around:%f,%f,%f)[name][leisure~"^(park|stadium|sports_centre|pitch|playground)$"];
              node(around:%f,%f,%f)[name][shop~"^(mall|supermarket|convenience|bakery|clothes|books)$"];
              way(around:%f,%f,%f)[name][leisure=park];
              way(around:%f,%f,%f)[name][amenity~"^(university|college|hospital|marketplace)$"];
              way(around:%f,%f,%f)[name][tourism~"^(attraction|museum)$"];
            );
            out center tags %d;
            """.formatted(
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            NEARBY_RADIUS_M, lat, lng,
            Math.max(limit, 12)
        );
        try {
            String body = "data=" + URLEncoder.encode(ql, StandardCharsets.UTF_8);
            JsonNode root = restClient.post()
                .uri("https://overpass-api.de/api/interpreter")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
            return mapOverpassResults(root, limit);
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    private List<PlaceSuggestionResponse> nominatimAreaFallback(double lat, double lng, int limit) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromUriString("https://nominatim.openstreetmap.org/search")
            .queryParam("format", "jsonv2")
            .queryParam("q", "cafe")
            .queryParam("limit", limit)
            .queryParam("addressdetails", 1)
            .queryParam("accept-language", "vi,en")
            .queryParam("countrycodes", "vn");
        double minLon = lng - SEARCH_VIEWBOX_DEG;
        double maxLon = lng + SEARCH_VIEWBOX_DEG;
        double minLat = lat - SEARCH_VIEWBOX_DEG;
        double maxLat = lat + SEARCH_VIEWBOX_DEG;
        builder.queryParam(
            "viewbox",
            String.format(Locale.ROOT, "%f,%f,%f,%f", minLon, maxLat, maxLon, minLat)
        );
        builder.queryParam("bounded", 1);
        try {
            JsonNode root = restClient.get()
                .uri(builder.build().encode().toUri())
                .retrieve()
                .body(JsonNode.class);
            return mapNominatimResults(root, limit);
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    private List<PlaceSuggestionResponse> mapOverpassResults(JsonNode root, int capped) {
        if (root == null || !root.path("elements").isArray()) {
            return List.of();
        }
        List<PlaceSuggestionResponse> out = new ArrayList<>();
        for (JsonNode el : root.path("elements")) {
            if (out.size() >= capped) {
                break;
            }
            JsonNode tags = el.path("tags");
            String name = text(tags, "name");
            if (name == null) {
                name = text(tags, "name:vi");
            }
            if (name == null || name.isBlank()) {
                continue;
            }
            Double plat = parseDouble(text(el, "lat"));
            Double plng = parseDouble(text(el, "lon"));
            if (plat == null || plng == null) {
                plat = parseDouble(text(el.path("center"), "lat"));
                plng = parseDouble(text(el.path("center"), "lon"));
            }
            if (plat == null || plng == null) {
                continue;
            }
            String type = firstText(
                tags,
                "amenity",
                "tourism",
                "leisure",
                "shop",
                "highway",
                "building"
            );
            String suburb = firstText(tags, "addr:suburb", "addr:quarter", "addr:neighbourhood");
            String city = firstText(tags, "addr:city", "addr:town", "addr:province");
            String road = text(tags, "addr:street");
            List<String> addrParts = new ArrayList<>();
            if (type != null) {
                addrParts.add(humanizeTag(type));
            }
            if (road != null) {
                addrParts.add(road);
            }
            if (suburb != null) {
                addrParts.add(suburb);
            }
            if (city != null) {
                addrParts.add(city);
            }
            String osmType = text(el, "type");
            String osmId = text(el, "id");
            String placeId = osmType != null && osmId != null ? "osm:" + osmType + ":" + osmId : null;
            out.add(new PlaceSuggestionResponse(
                placeId,
                truncate(name, 180),
                truncate(addrParts.isEmpty() ? null : String.join(", ", addrParts), 400),
                plat,
                plng
            ));
        }
        return List.copyOf(out);
    }

    private List<PlaceSuggestionResponse> mapNominatimResults(JsonNode root, int capped) {
        if (root == null || !root.isArray()) {
            return List.of();
        }
        List<PlaceSuggestionResponse> out = new ArrayList<>(Math.min(root.size(), capped));
        for (JsonNode node : root) {
            if (out.size() >= capped) {
                break;
            }
            PlaceSuggestionResponse mapped = mapNominatimOne(node);
            if (mapped != null) {
                out.add(mapped);
            }
        }
        return List.copyOf(out);
    }

    private PlaceSuggestionResponse mapNominatimOne(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String name = text(node, "name");
        String display = text(node, "display_name");
        if (name == null || name.isBlank()) {
            name = firstSegment(display);
        }
        if (name == null || name.isBlank()) {
            JsonNode address = node.path("address");
            name = firstText(
                address,
                "amenity",
                "tourism",
                "leisure",
                "shop",
                "building",
                "road",
                "suburb",
                "neighbourhood",
                "quarter",
                "village",
                "town",
                "city"
            );
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
        return new PlaceSuggestionResponse(
            placeId,
            truncate(name, 180),
            truncate(address, 400),
            lat,
            lng
        );
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

    private List<PlaceSuggestionResponse> sortByDistance(
        List<PlaceSuggestionResponse> places,
        double lat,
        double lng,
        int capped
    ) {
        return places.stream()
            .sorted(Comparator.comparingDouble(p -> distanceMeters(lat, lng, p.lat(), p.lng())))
            .limit(capped)
            .toList();
    }

    private static double distanceMeters(double lat1, double lng1, Double lat2, Double lng2) {
        if (lat2 == null || lng2 == null) {
            return Double.MAX_VALUE;
        }
        double r = 6371000d;
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }

    private void putCache(String key, List<PlaceSuggestionResponse> results) {
        if (cache.size() >= CACHE_MAX) {
            cache.clear();
        }
        cache.put(key, new CacheEntry(List.copyOf(results), Instant.now().plus(CACHE_TTL)));
    }

    private static String dedupeKey(PlaceSuggestionResponse place) {
        if (place.placeId() != null && !place.placeId().isBlank()) {
            return place.placeId();
        }
        return place.name().toLowerCase(Locale.ROOT)
            + "|"
            + (place.lat() == null ? "" : roundCoord(place.lat()))
            + "|"
            + (place.lng() == null ? "" : roundCoord(place.lng()));
    }

    private static boolean validCoord(Double lat, Double lng) {
        return lat != null
            && lng != null
            && !lat.isNaN()
            && !lng.isNaN()
            && lat >= -90
            && lat <= 90
            && lng >= -180
            && lng <= 180;
    }

    private static String roundCoord(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    private static String firstSegment(String display) {
        if (display == null || display.isBlank()) {
            return null;
        }
        int comma = display.indexOf(',');
        return comma > 0 ? display.substring(0, comma).trim() : display.trim();
    }

    private static String firstText(JsonNode node, String... names) {
        for (String name : names) {
            String value = text(node, name);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
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

    private static String humanizeTag(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return switch (raw) {
            case "fast_food" -> "Ăn nhanh";
            case "place_of_worship" -> "Tôn giáo";
            case "guest_house" -> "Nhà nghỉ";
            case "theme_park" -> "Công viên giải trí";
            case "sports_centre" -> "TT thể thao";
            default -> Character.toUpperCase(raw.charAt(0)) + raw.substring(1).replace('_', ' ');
        };
    }

    private record CacheEntry(List<PlaceSuggestionResponse> results, Instant expiresAt) {
    }
}
