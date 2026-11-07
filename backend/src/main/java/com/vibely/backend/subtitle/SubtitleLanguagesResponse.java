package com.vibely.backend.subtitle;

import java.util.List;

public record SubtitleLanguagesResponse(List<String> languages, String sourceLang) {}
