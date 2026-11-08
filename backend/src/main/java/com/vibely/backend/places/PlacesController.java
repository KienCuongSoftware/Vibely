package com.vibely.backend.places;

import com.vibely.backend.common.ApiResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
public class PlacesController {

    private final NominatimPlacesSearchService placesSearchService;

    public PlacesController(NominatimPlacesSearchService placesSearchService) {
        this.placesSearchService = placesSearchService;
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<PlaceSuggestionResponse>> search(
        @RequestParam(value = "q", required = false) String q,
        @RequestParam(defaultValue = "8") int limit
    ) {
        return ApiResponse.success(placesSearchService.search(q, limit));
    }
}