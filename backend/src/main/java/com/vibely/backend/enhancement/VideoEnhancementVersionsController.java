package com.vibely.backend.enhancement;

import com.vibely.backend.common.ApiResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class VideoEnhancementVersionsController {

    private final EnhancementJobService jobService;

    public VideoEnhancementVersionsController(EnhancementJobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/{videoId}/versions")
    public ApiResponse<List<Map<String, Object>>> versions(@PathVariable Long videoId) {
        List<Map<String, Object>> rows = jobService.listActiveVersions(videoId).stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("kind", v.getKind().name());
            m.put("profile", v.getProfile());
            m.put("label", v.getLabel());
            m.put("masterPlaylistUrl", v.getMasterPlaylistUrl());
            m.put("widthPx", v.getWidthPx());
            m.put("heightPx", v.getHeightPx());
            m.put("aiEnhanced", v.getKind() == VideoVersionKind.AI_ENHANCED);
            return m;
        }).toList();
        return ApiResponse.success(rows);
    }
}
