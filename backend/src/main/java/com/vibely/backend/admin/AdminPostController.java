package com.vibely.backend.admin;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.video.VideoPublicIds;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/posts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPostController {

    private final AdminPostService adminPostService;

    public AdminPostController(AdminPostService adminPostService) {
        this.adminPostService = adminPostService;
    }

    @GetMapping
    public ApiResponse<AdminPostPageResponse> listPosts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String status
    ) {
        return ApiResponse.success(adminPostService.listPosts(page, size, query, status));
    }

    @DeleteMapping("/{publicId}")
    public ApiResponse<Void> deletePost(@PathVariable String publicId) {
        adminPostService.deletePost(VideoPublicIds.parse(publicId));
        return ApiResponse.success(null);
    }
}
