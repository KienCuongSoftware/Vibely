package com.vibely.backend.discovery.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

    public String transcribeAudio(Path audioFile) throws Exception {
        String boundary = "----VibelyBoundary" + UUID.randomUUID();
        byte[] body = buildMultipartBody(
            boundary,
            Map.of(
                "model", properties.getWhisperModel(),
                "language", "vi",
                "response_format", "json"
            ),
            "file",
            audioFile.getFileName().toString(),
            "audio/mpeg",
            Files.readAllBytes(audioFile)
        );
        String responseBody = postMultipart("/audio/transcriptions", boundary, body, 120);
        JsonNode root = objectMapper.readTree(responseBody);
        return root.path("text").asText("").trim();
    }

    public String extractVisibleTextFromImages(List<Path> imageFiles) throws Exception {
        if (imageFiles == null || imageFiles.isEmpty()) {
            return "";
        }
        List<Map<String, Object>> content = new ArrayList<>();
        content.add(Map.of(
            "type", "text",
            "text", """
                Extract all visible on-screen text from these short-form video frames.
                Return plain text only, one line per distinct text block. Ignore watermarks @username.
                If no readable text, return an empty string.
                """
        ));
        for (Path image : imageFiles) {
            byte[] bytes = Files.readAllBytes(image);
            String base64 = Base64.getEncoder().encodeToString(bytes);
            content.add(Map.of(
                "type", "image_url",
                "image_url", Map.of("url", "data:image/jpeg;base64," + base64)
            ));
        }
        Map<String, Object> body = Map.of(
            "model", properties.getVisionModel(),
            "messages", List.of(Map.of("role", "user", "content", content)),
            "max_tokens", 500
        );
        String responseBody = post("/chat/completions", body);
        JsonNode root = objectMapper.readTree(responseBody);
        return root.path("choices").path(0).path("message").path("content").asText("").trim();
    }

    private byte[] buildMultipartBody(
        String boundary,
        Map<String, String> fields,
        String fileField,
        String filename,
        String contentType,
        byte[] fileBytes
    ) throws IOException {
        String lineEnd = "\r\n";
        var out = new java.io.ByteArrayOutputStream();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            out.write(("--" + boundary + lineEnd).getBytes(StandardCharsets.UTF_8));
            out.write(("Content-Disposition: form-data; name=\"" + entry.getKey() + "\"" + lineEnd).getBytes(StandardCharsets.UTF_8));
            out.write((lineEnd + entry.getValue() + lineEnd).getBytes(StandardCharsets.UTF_8));
        }
        out.write(("--" + boundary + lineEnd).getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + fileField + "\"; filename=\"" + filename + "\"" + lineEnd)
            .getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + lineEnd + lineEnd).getBytes(StandardCharsets.UTF_8));
        out.write(fileBytes);
        out.write(lineEnd.getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--" + lineEnd).getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private String postMultipart(String path, String boundary, byte[] body, int timeoutSeconds) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(trimTrailingSlash(properties.getOpenAiBaseUrl()) + path))
            .timeout(Duration.ofSeconds(timeoutSeconds))
            .header("Authorization", "Bearer " + properties.getOpenAiApiKey())
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            log.warn("OpenAI multipart request failed status={} body={}", response.statusCode(), truncate(response.body()));
            throw new IllegalStateException("OpenAI HTTP " + response.statusCode());
        }
        return response.body();
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
