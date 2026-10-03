package com.vibely.backend.live.media;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * nginx {@code auth_request} target for HLS playlists: 204 lets nginx serve the file, 403 refuses it.
 * The proxy forwards the original request URI (path + token) in {@code X-Original-URI}. It reveals
 * nothing beyond "valid or not" for an HMAC-signed token, so it needs no shared secret.
 */
@RestController
@RequestMapping("/api/live-media")
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class LiveHlsAuthController {

    private final LiveHlsAccessService accessService;

    public LiveHlsAuthController(LiveHlsAccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping("/hls-auth")
    public ResponseEntity<Void> authorize(@RequestHeader(value = "X-Original-URI", required = false) String originalUri) {
        HttpStatus status = accessService.authorize(originalUri) ? HttpStatus.NO_CONTENT : HttpStatus.FORBIDDEN;
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).build();
    }
}
