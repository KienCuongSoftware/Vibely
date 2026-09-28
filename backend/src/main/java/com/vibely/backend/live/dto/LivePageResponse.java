package com.vibely.backend.live.dto;

import java.util.List;

public record LivePageResponse(List<LiveResponse> items, boolean hasNext, int page, int size) {}
