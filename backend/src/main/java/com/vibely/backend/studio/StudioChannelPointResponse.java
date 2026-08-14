package com.vibely.backend.studio;

import java.time.LocalDate;

public record StudioChannelPointResponse(
    LocalDate day,
    long views,
    long profileViews,
    long likes,
    long comments,
    long shares,
    long newFollowers
) {}
