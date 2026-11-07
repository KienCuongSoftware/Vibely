package com.vibely.backend.subtitle;

import java.util.List;

public record SubtitleTrackResponse(
    String status,
    String lang,
    String source,
    String message,
    List<SubtitleCueDto> cues
) {
    public static SubtitleTrackResponse ready(String lang, String source, List<SubtitleCueDto> cues) {
        return new SubtitleTrackResponse("READY", lang, source, null, cues);
    }

    public static SubtitleTrackResponse pending(String lang) {
        return new SubtitleTrackResponse("PENDING", lang, "translated", "Translation in progress", List.of());
    }

    public static SubtitleTrackResponse failed(String lang, String message) {
        return new SubtitleTrackResponse("FAILED", lang, null, message, List.of());
    }

    public static SubtitleTrackResponse unavailable(String message) {
        return new SubtitleTrackResponse("UNAVAILABLE", null, null, message, List.of());
    }
}
