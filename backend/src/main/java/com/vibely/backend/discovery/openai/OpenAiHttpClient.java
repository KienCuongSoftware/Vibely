package com.vibely.backend.discovery.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class OpenAiHttpClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiHttpClient.class);

    private final DiscoveryProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiHttpClient(DiscoveryProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    public String createStructuredUnderstanding(String systemPrompt, String userPrompt) throws Exception {
        Map<String, Object> body = Map.of(
            "model", properties.getUnderstandingModel(),
            "input", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            ),
            "text", Map.of(
                "format", Map.of("type", "json_object")
            )
        );
        String responseBody = post("/responses", body);
        return extractResponseText(responseBody);
    }

    public float[] createEmbedding(String input) throws Exception {
        Map<String, Object> body = Map.of(
            "model", properties.getEmbeddingModel(),
            "input", input,
            "dimensions", properties.getEmbeddingDimensions()
        );
        String responseBody = post("/embeddings", body);
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode data = root.path("data");
        if (!data.isArray() || data.isEmpty()) {
            throw new IllegalStateException("OpenAI embeddings response missing data");
        }
        JsonNode embedding = data.get(0).path("embedding");
        float[] vector = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            vector[i] = (float) embedding.get(i).asDouble();
        }
        return vector;
    }

    private String post(String path, Map<String, Object> body) throws Exception {
        String json = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(trimTrailingSlash(properties.getOpenAiBaseUrl()) + path))
            .timeout(Duration.ofSeconds(properties.getUnderstandingTimeoutSeconds()))
            .header("Authorization", "Bearer " + properties.getOpenAiApiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            log.warn("OpenAI request failed status={} body={}", response.statusCode(), truncate(response.body()));
            throw new IllegalStateException("OpenAI HTTP " + response.statusCode());
        }
        return response.body();
    }

    private String extractResponseText(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode output = root.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.path("content");
                if (content.isArray()) {
                    for (JsonNode part : content) {
                        if ("output_text".equals(part.path("type").asText()) || part.has("text")) {
                            String text = part.path("text").asText(null);
                            if (text != null && !text.isBlank()) {
                                return text;
                            }
                        }
                    }
                }
            }
        }
        JsonNode fallback = root.path("output_text");
        if (fallback.isTextual()) {
            return fallback.asText();
        }
        throw new IllegalStateException("Unable to parse OpenAI responses payload");
    }

    private static String trimTrailingSlash(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "https://api.openai.com/v1";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private static String truncate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() <= 500 ? value : value.substring(0, 500) + "...";
    }
}
