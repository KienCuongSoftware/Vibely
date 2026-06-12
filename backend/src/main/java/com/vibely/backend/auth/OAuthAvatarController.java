package com.vibely.backend.auth;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/oauth-avatar")
public class OAuthAvatarController {

    private final OAuthAvatarProxyService oAuthAvatarProxyService;

    public OAuthAvatarController(OAuthAvatarProxyService oAuthAvatarProxyService) {
        this.oAuthAvatarProxyService = oAuthAvatarProxyService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<byte[]> getOAuthAvatar(@PathVariable long userId) {
        return oAuthAvatarProxyService.fetchForUser(userId)
            .map(image -> ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(6)).cachePublic())
                .header(HttpHeaders.CONTENT_TYPE, image.contentType())
                .body(image.body()))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
