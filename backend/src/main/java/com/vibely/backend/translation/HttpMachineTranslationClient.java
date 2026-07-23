package com.vibely.backend.translation;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@ConditionalOnProperty(prefix = "app.translation", name = "enabled", havingValue = "true")
public class HttpMachineTranslationClient implements MachineTranslationClient {

    private static final Logger log = LoggerFactory.getLogger(HttpMachineTranslationClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public HttpMachineTranslationClient(TranslationProperties properties) {
        this.restClient = RestClient.builder()
            .baseUrl(trimSlash(properties.getBaseUrl()))
            .defaultHeader("X-Internal-Token", properties.getInternalToken())
            .build();
    }

    @Override
    public DetectResult detect(String text) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("text", text == null ? "" : text);
            Map<String, Object> body = restClient.post()
                .uri("/v1/detect")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(MAP_TYPE);
            if (body == null) {
                return new DetectResult("und", 0);
            }
            String language = String.valueOf(body.getOrDefault("language", "und"));
            double confidence = toDouble(body.get("confidence"));
            return new DetectResult(language, confidence);
        } catch (RestClientException ex) {
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
        Map<String, Object> body = restClient.post()
            .uri("/v1/translate")
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .body(MAP_TYPE);
        if (body == null) {
            throw new IllegalStateException("Empty translation response");
        }
        return new TranslateResult(
            String.valueOf(body.getOrDefault("translated_text", "")),
            String.valueOf(body.getOrDefault("source_lang", sourceLang == null ? "und" : sourceLang)),
            String.valueOf(body.getOrDefault("target_lang", targetLang)),
            String.valueOf(body.getOrDefault("model", "unknown"))
        );
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
}
