package com.vibely.backend.live.media;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.live.config.LiveProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * SRS v6 HTTP API client. Responses are {@code {"code":0,"server":"<id>",...}}; any non-zero code
 * is an SRS-side error. The API must only be reachable from the backend host.
 */
@Component
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class HttpSrsClient implements SrsClient {

    private static final int PAGE_SIZE = 500;
    private static final int MAX_PAGES = 20;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String app;
    private final boolean configured;

    public HttpSrsClient(LiveProperties properties, ObjectMapper objectMapper) {
        LiveProperties.Media media = properties.getMedia();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(media.getApiConnectTimeoutMs());
        requestFactory.setReadTimeout(media.getApiReadTimeoutMs());
        String baseUrl = trimSlash(media.getApiUrl());
        this.configured = StringUtils.hasText(baseUrl);
        RestClient.Builder builder = RestClient.builder()
            .requestFactory(requestFactory)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        if (configured) {
            builder.baseUrl(baseUrl);
        }
        if (StringUtils.hasText(media.getApiUsername())) {
            String credentials = media.getApiUsername() + ":" + media.getApiPassword();
            builder.defaultHeader(
                HttpHeaders.AUTHORIZATION,
                "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8))
            );
        }
        this.restClient = builder.build();
        this.objectMapper = objectMapper;
        this.app = media.getApp();
    }

    @Override
    public StreamsSnapshot listStreams() {
        Map<String, SrsStream> streams = new LinkedHashMap<>();
        String serverId = null;
        for (int page = 0; page < MAX_PAGES; page++) {
            JsonNode body = get("/api/v1/streams/?start=" + (page * PAGE_SIZE) + "&count=" + PAGE_SIZE);
            serverId = body.path("server").asText(null);
            JsonNode items = body.path("streams");
            for (JsonNode stream : items) {
                if (!app.equals(stream.path("app").asText())) {
                    continue;
                }
                JsonNode publish = stream.path("publish");
                String name = stream.path("name").asText();
                streams.put(name, new SrsStream(name, publish.path("active").asBoolean(false), publish.path("cid").asText(null)));
            }
            if (items.size() < PAGE_SIZE) {
                break;
            }
        }
        return new StreamsSnapshot(serverId, streams);
    }

    @Override
    public List<SrsClientInfo> listClients() {
        List<SrsClientInfo> clients = new ArrayList<>();
        for (int page = 0; page < MAX_PAGES; page++) {
            JsonNode items = get("/api/v1/clients/?start=" + (page * PAGE_SIZE) + "&count=" + PAGE_SIZE).path("clients");
            for (JsonNode client : items) {
                clients.add(new SrsClientInfo(
                    client.path("id").asText(),
                    client.path("name").asText(),
                    client.path("publish").asBoolean(false)
                ));
            }
            if (items.size() < PAGE_SIZE) {
                break;
            }
        }
        return clients;
    }

    @Override
    public boolean kickClient(String clientId) {
        requireConfigured();
        try {
            return restClient.delete()
                .uri("/api/v1/clients/{id}", clientId)
                .exchange((request, response) -> {
                    if (response.getStatusCode().is5xxServerError()) {
                        throw new SrsUnavailableException("SRS kick failed with HTTP " + response.getStatusCode().value());
                    }
                    // Unknown client (already disconnected) is answered with a non-zero code.
                    return response.getStatusCode().is2xxSuccessful() && readBody(response).path("code").asInt(-1) == 0;
                });
        } catch (RestClientException ex) {
            throw new SrsUnavailableException("SRS unreachable", ex);
        }
    }

    private JsonNode get(String path) {
        requireConfigured();
        try {
            return restClient.get()
                .uri(path)
                .exchange((request, response) -> {
                    if (!response.getStatusCode().is2xxSuccessful()) {
                        throw new SrsUnavailableException("SRS API " + path + " HTTP " + response.getStatusCode().value());
                    }
                    JsonNode body = readBody(response);
                    if (body.path("code").asInt(-1) != 0) {
                        throw new SrsUnavailableException("SRS API " + path + " code " + body.path("code").asText());
                    }
                    return body;
                });
        } catch (RestClientException ex) {
            throw new SrsUnavailableException("SRS unreachable", ex);
        }
    }

    private JsonNode readBody(ClientHttpResponse response) throws IOException {
        byte[] bytes = response.getBody().readAllBytes();
        if (bytes.length == 0) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(bytes);
        } catch (IOException ex) {
            throw new SrsUnavailableException("SRS API returned a non-JSON body", ex);
        }
    }

    private void requireConfigured() {
        if (!configured) {
            throw new SrsUnavailableException("live.media.api-url is not configured");
        }
    }

    private static String trimSlash(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
