package com.vibely.backend.auth.service;

import com.vibely.backend.auth.dto.ProxiedAvatarImage;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class OAuthAvatarProxyService {

    private static final Duration FETCH_TIMEOUT = Duration.ofSeconds(10);

    private final UserRepository userRepository;
    private final HttpClient httpClient;

    public OAuthAvatarProxyService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(FETCH_TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    public Optional<ProxiedAvatarImage> fetchForUser(long userId) {
        return userRepository.findById(userId).flatMap(this::fetchForUser);
    }

    public Optional<ProxiedAvatarImage> fetchForUser(User user) {
        if (user == null) {
            return Optional.empty();
        }
        if (StringUtils.hasText(user.getAvatarUrl()) && !UserAvatarResolver.isOAuthCdnUrl(user.getAvatarUrl())) {
            return Optional.empty();
        }
        String oauthUrl = user.getGoogleAvatarUrl();
        if (!UserAvatarResolver.isOAuthCdnUrl(oauthUrl)) {
            return Optional.empty();
        }
        return fetchRemote(oauthUrl);
    }

    private Optional<ProxiedAvatarImage> fetchRemote(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url.trim()))
                .timeout(FETCH_TIMEOUT)
                .header("User-Agent", "VibelyAvatarProxy/1.0")
                .GET()
                .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Optional.empty();
            }
            byte[] body = response.body();
            if (body == null || body.length == 0) {
                return Optional.empty();
            }
            String contentType = response.headers()
                .firstValue("Content-Type")
                .map(value -> value.split(";", 2)[0].trim())
                .filter(value -> value.startsWith("image/"))
                .orElse("image/jpeg");
            return Optional.of(new ProxiedAvatarImage(body, contentType));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
