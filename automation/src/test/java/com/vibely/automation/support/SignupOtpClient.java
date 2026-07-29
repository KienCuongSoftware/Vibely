package com.vibely.automation.support;

import com.vibely.automation.utils.PropertyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Issues a REGISTER OTP via {@code POST /api/auth/send-code} (bypasses UI anti-bot).
 *
 * <p>When {@code app.mail.expose-code-in-api} is enabled, the response includes {@code demoCode}.
 */
public final class SignupOtpClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(SignupOtpClient.class);
    private static final Pattern DEMO_CODE = Pattern.compile("\"demoCode\"\\s*:\\s*\"?(\\d{6})\"?");

    private SignupOtpClient() {
    }

    /**
     * Requests a register OTP for {@code email} with {@code challengePassed=true}.
     *
     * @return demo/OTP code when the API exposes it; otherwise empty
     */
    public static Optional<String> requestRegisterDemoCode(String email) {
        String apiBase = PropertyUtils.get("api.base.url", PropertyUtils.baseUrl());
        for (String candidateBase : apiBaseCandidates(apiBase)) {
            Optional<String> code = requestOnce(candidateBase, email);
            if (code.isPresent()) {
                return code;
            }
        }
        return Optional.empty();
    }

    private static Optional<String> requestOnce(String apiBase, String email) {
        String url = trimTrailingSlash(apiBase) + "/api/auth/send-code";
        String body = "{\"email\":\"" + email.replace("\"", "") + "\","
                + "\"purpose\":\"REGISTER\",\"challengePassed\":true}";

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String responseBody = response.body() == null ? "" : response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("send-code HTTP {} via {}: {}", response.statusCode(), url, responseBody);
                return Optional.empty();
            }
            Matcher matcher = DEMO_CODE.matcher(responseBody);
            if (matcher.find()) {
                LOGGER.info("Got demoCode via {}", url);
                return Optional.of(matcher.group(1));
            }
            LOGGER.warn("send-code OK but no demoCode via {}. Body={}", url, responseBody);
            return Optional.empty();
        } catch (Exception e) {
            LOGGER.warn("send-code failed via {}: {}", url, e.toString());
            return Optional.empty();
        }
    }

    private static java.util.List<String> apiBaseCandidates(String apiBase) {
        java.util.LinkedHashSet<String> bases = new java.util.LinkedHashSet<>();
        if (apiBase != null && !apiBase.isBlank()) {
            bases.add(apiBase);
            bases.add(apiBase.replace("://localhost", "://127.0.0.1"));
        }
        bases.add("http://127.0.0.1:5173");
        bases.add("http://127.0.0.1:8080");
        return new java.util.ArrayList<>(bases);
    }

    private static String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
