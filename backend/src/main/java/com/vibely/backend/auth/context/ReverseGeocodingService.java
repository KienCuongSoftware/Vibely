package com.vibely.backend.auth.context;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class ReverseGeocodingService {

    private final RestClient restClient;
    private final boolean enabled;

    public ReverseGeocodingService(
        RestClient.Builder builder,
        @Value("${app.geocoding.nominatim-enabled:true}") boolean enabled
    ) {
        this.restClient = builder.defaultHeader("User-Agent", "Vibely/1.0 security-contact").build();
        this.enabled = enabled;
    }

    public LocationInfo resolve(Double latitude, Double longitude) {
        if (!enabled || latitude == null || longitude == null || !valid(latitude, longitude)) {
            return LocationInfo.unknown();
        }
        URI uri = UriComponentsBuilder
            .fromUriString("https://nominatim.openstreetmap.org/reverse")
            .queryParam("format", "jsonv2")
            .queryParam("lat", latitude)
            .queryParam("lon", longitude)
            .queryParam("accept-language", "vi,en")
            .queryParam("zoom", 18)
            .queryParam("addressdetails", 1)
            .build()
            .toUri();
        try {
            JsonNode address = restClient.get()
                .uri(uri)
                .retrieve()
                .body(JsonNode.class)
                .path("address");
            return new LocationInfo(
                text(address, "country"),
                firstText(address, "state", "province", "region"),
                firstText(address, "city", "town", "municipality"),
                firstText(address, "city_district", "county", "district", "suburb"),
                firstText(address, "quarter", "neighbourhood", "ward", "village")
            );
        } catch (RuntimeException ex) {
            return LocationInfo.unknown();
        }
    }

    private boolean valid(Double latitude, Double longitude) {
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    private String firstText(JsonNode node, String... names) {
        for (String name : names) {
            String value = text(node, name);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String text(JsonNode node, String name) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        String value = node.path(name).asText("");
        return value.isBlank() ? null : value.trim();
    }
}
