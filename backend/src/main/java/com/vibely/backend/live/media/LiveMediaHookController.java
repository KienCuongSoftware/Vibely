package com.vibely.backend.live.media;

import com.vibely.backend.live.media.dto.SrsHookRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SRS HTTP hook endpoint, authenticated by {@code InternalApiAuthFilter} (hook token). SRS accepts a
 * client only on HTTP 200 with {@code {"code":0}}; anything else makes it drop the client. Not exposed
 * by the reverse proxy ({@code /api/internal/} returns 404 publicly).
 */
@RestController
@RequestMapping("/api/internal/live/media")
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class LiveMediaHookController {

    private static final Logger log = LoggerFactory.getLogger(LiveMediaHookController.class);

    private final LiveMediaHookService hookService;

    public LiveMediaHookController(LiveMediaHookService hookService) {
        this.hookService = hookService;
    }

    @PostMapping(value = "/srs-hooks", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Integer>> hook(@RequestBody SrsHookRequest hook) {
        boolean accepted;
        try {
            accepted = hookService.handle(hook);
        } catch (RuntimeException ex) {
            // Fail closed for authorization hooks; SRS ignores the answer for on_unpublish/on_stop.
            log.error("live.media.hook_failed action={} reason={}", hook.action(), ex.getClass().getSimpleName(), ex);
            accepted = false;
        }
        if (accepted) {
            return ResponseEntity.ok(Map.of("code", 0));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("code", HttpStatus.FORBIDDEN.value()));
    }
}
