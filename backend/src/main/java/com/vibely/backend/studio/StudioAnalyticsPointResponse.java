package com.vibely.backend.studio;

import java.time.LocalDate;

public record StudioAnalyticsPointResponse(LocalDate day, long views, long likes, long comments) {}
