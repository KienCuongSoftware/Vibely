package com.vibely.backend.subtitle;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class VideoSubtitleController {

    private static final Logger log = LoggerFactory.getLogger(VideoSubtitleController.class);

    private final VideoSubtitleService subtitleService;

    public VideoSubtitleController(VideoSubtitleService subtitleService) {
        this.subtitleService = subtitleService;
    }

    @GetMapping("/{publicId}/subtitles/languages")
    public SubtitleLanguagesResponse languages(@PathVariable UUID publicId) {
        return subtitleService.listLanguages(publicId);
    }

    /**
     * Timed CC cues. Pass {@code request=true} to lazy-translate into {@code lang} when missing.
     */
    @GetMapping("/{publicId}/subtitles")
    public SubtitleTrackResponse subtitles(
        @PathVariable UUID publicId,
        @RequestParam String lang,
        @RequestParam(defaultValue = "false") boolean request
    ) {
        try {
            return subtitleService.getOrRequest(publicId, lang, request);
        } catch (RuntimeException ex) {
            log.error("subtitles GET failed publicId={} lang={}: {}", publicId, lang, ex.toString(), ex);
            throw ex;
        }
    }
}
