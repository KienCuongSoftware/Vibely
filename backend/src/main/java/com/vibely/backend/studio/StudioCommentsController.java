package com.vibely.backend.studio;

import com.vibely.backend.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/studio/comments")
public class StudioCommentsController {

    private final StudioCommentsService studioCommentsService;

    public StudioCommentsController(StudioCommentsService studioCommentsService) {
        this.studioCommentsService = studioCommentsService;
    }

    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioCommentPageResponse> list(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "") String query,
        @RequestParam(defaultValue = "all") String postedBy,
        @RequestParam(defaultValue = "false") boolean onlyUnreplied,
        @RequestParam(defaultValue = "0") long minFollowers,
        @RequestParam(defaultValue = "latest") String sort
    ) {
        return ApiResponse.success(
            studioCommentsService.getChannelComments(
                authentication.getName(),
                page,
                size,
                query,
                postedBy,
                onlyUnreplied,
                minFollowers,
                sort
            )
        );
    }
}
