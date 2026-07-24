package com.vibely.backend.translation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * HTTP client tới FastAPI translation worker.
 * Parse body dạng String (bỏ qua Content-Type) — tránh UnknownContentTypeException
 * khi proxy/docker trả application/octet-stream dù body vẫn là JSON.
 */
@Component
@ConditionalOnProperty(prefix = "app.translation", name = "enabled", havingValue = "true")
public class HttpMachineTranslationClient implements MachineTranslationClient {

    private static final Logger log = LoggerFactory.getLogger(HttpMachineTranslationClient.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public HttpMachineTranslationClient(TranslationProperties properties, ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        // NLLB CPU cold/warm có thể > 20s
        requestFactory.setReadTimeout(120_000);
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
            .baseUrl(trimSlash(properties.getBaseUrl()))
            .requestFactory(requestFactory)
            .defaultHeader("X-Internal-Token", properties.getInternalToken())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        log.info("HttpMachineTranslationClient baseUrl={}", trimSlash(properties.getBaseUrl()));
    }

    @Override
    public DetectResult detect(String text) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("text", text == null ? "" : text);
            Map<String, Object> body = postJson("/v1/detect", payload);
            String language = String.valueOf(body.getOrDefault("language", "und"));
            double confidence = toDouble(body.get("confidence"));
            return new DetectResult(language, confidence);
        } catch (Exception ex) {
            log.warn("Translation detect failed: {}", ex.getMessage());
            return new DetectResult("und", 0);
        }
    }

    @Override
    public TranslateResult translate(String text, String sourceLang, String targetLang) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("text", text == null ? "" : text);
        payload.put("source_lang", sourceLang == null ? "" : sourceLang);
        payload.put("target_lang", targetLang);
        Map<String, Object> body = postJson("/v1/translate", payload);
        return new TranslateResult(
            String.valueOf(body.getOrDefault("translated_text", "")),
            String.valueOf(body.getOrDefault("source_lang", sourceLang == null ? "und" : sourceLang)),
            String.valueOf(body.getOrDefault("target_lang", targetLang)),
            String.valueOf(body.getOrDefault("model", "unknown"))
        );
    }

    private Map<String, Object> postJson(String path, Map<String, Object> payload) {
        return restClient.post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
            .body(payload)
            .exchange((request, response) -> parseJsonMap(path, response));
    }

    private Map<String, Object> parseJsonMap(String path, ClientHttpResponse response) throws Exception {
        byte[] bytes = response.getBody().readAllBytes();
        String raw = new String(bytes, StandardCharsets.UTF_8);
        int code = response.getStatusCode().value();
        MediaType contentType = response.getHeaders().getContentType();
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException(
                "Translation " + path + " HTTP " + code
                    + (contentType != null ? " (" + contentType + ")" : "")
                    + ": " + truncate(raw, 500)
            );
        }
        if (raw.isBlank()) {
            throw new IllegalStateException(
                "Translation " + path + " empty body"
                    + (contentType != null ? " content-type=" + contentType : "")
                    + " — check APP_TRANSLATION_BASE_URL and translation-api /health"
            );
        }
        String trimmed = raw.trim();
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
            throw new IllegalStateException(
                "Translation " + path + " non-JSON body"
                    + (contentType != null ? " content-type=" + contentType : "")
                    + ": " + truncate(raw, 300)
            );
        }
        try {
            return objectMapper.readValue(raw, MAP_TYPE);
        } catch (Exception ex) {
            throw new IllegalStateException(
                "Translation " + path + " JSON parse failed: " + truncate(raw, 300),
                ex
            );
        }
    }

    private static String trimSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://127.0.0.1:8002";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static double toDouble(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        if (value == null) {
            return 0;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        String oneLine = value.replace('\n', ' ').replace('\r', ' ').trim();
        return oneLine.length() <= max ? oneLine : oneLine.substring(0, max);
    }
}
