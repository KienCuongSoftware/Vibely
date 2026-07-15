package com.vibely.backend.admin;

import com.vibely.backend.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/content-understanding")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCuController {

    private final AdminCuService adminCuService;

    public AdminCuController(AdminCuService adminCuService) {
        this.adminCuService = adminCuService;
    }

    @GetMapping("/category-tag-mappings")
    public ApiResponse<java.util.List<AdminCuService.AdminCuMappingDto>> listMappings() {
        return ApiResponse.success(adminCuService.listMappings());
    }

    @PostMapping("/category-tag-mappings")
    public ApiResponse<AdminCuService.AdminCuMappingDto> createMapping(
        @RequestBody AdminCuService.AdminCuMappingUpsertRequest body
    ) {
        return ApiResponse.success(adminCuService.createMapping(body));
    }

    @PutMapping("/category-tag-mappings/{id}")
    public ApiResponse<AdminCuService.AdminCuMappingDto> updateMapping(
        @PathVariable Long id,
        @RequestBody AdminCuService.AdminCuMappingUpsertRequest body
    ) {
        return ApiResponse.success(adminCuService.updateMapping(id, body));
    }

    @DeleteMapping("/category-tag-mappings/{id}")
    public ApiResponse<Void> deleteMapping(@PathVariable Long id) {
        adminCuService.deleteMapping(id);
        return ApiResponse.success(null);
    }

    @GetMapping("/categories")
    public ApiResponse<java.util.List<AdminCuService.AdminCuOptionDto>> categories() {
        return ApiResponse.success(adminCuService.listCategories());
    }

    @GetMapping("/semantic-tags")
    public ApiResponse<java.util.List<AdminCuService.AdminCuOptionDto>> semanticTags() {
        return ApiResponse.success(adminCuService.listSemanticTags());
    }

    @PostMapping("/reanalyze")
    public ApiResponse<AdminCuService.AdminCuEnqueueResponse> reanalyze(
        @RequestBody AdminCuService.AdminCuReanalyzeRequest body
    ) {
        return ApiResponse.success(adminCuService.reanalyze(body));
    }

    @PostMapping("/backfill")
    public ApiResponse<AdminCuService.AdminCuEnqueueResponse> backfill(
        @RequestBody AdminCuService.AdminCuBackfillRequest body
    ) {
        return ApiResponse.success(adminCuService.backfill(body));
    }

    @GetMapping("/jobs")
    public ApiResponse<AdminCuService.AdminCuJobPageResponse> jobs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status
    ) {
        return ApiResponse.success(adminCuService.listJobs(page, size, status));
    }
}
