package com.vibely.backend.places;

import com.vibely.backend.auth.context.ClientIpResolver;
import com.vibely.backend.auth.context.GeoIpService;
import com.vibely.backend.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
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
    private final ClientIpResolver clientIpResolver;
    private final GeoIpService geoIpService;

    public PlacesController(
        NominatimPlacesSearchService placesSearchService,
        ClientIpResolver clientIpResolver,
        GeoIpService geoIpService
    ) {
        this.placesSearchService = placesSearchService;
        this.clientIpResolver = clientIpResolver;
        this.geoIpService = geoIpService;
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<PlaceSuggestionResponse>> search(
        @RequestParam(value = "q", required = false) String q,
        @RequestParam(defaultValue = "8") int limit,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng
    ) {
        return ApiResponse.success(placesSearchService.search(q, limit, lat, lng));
    }

    @GetMapping("/nearby")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<PlaceSuggestionResponse>> nearby(
        @RequestParam double lat,
        @RequestParam double lng,
        @RequestParam(defaultValue = "12") int limit
    ) {
        return ApiResponse.success(placesSearchService.nearby(lat, lng, limit));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<PlaceSuggestionResponse>> suggestions(
        HttpServletRequest request,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(defaultValue = "16") int limit
    ) {
        Double useLat = lat;
        Double useLng = lng;
        if (useLat == null || useLng == null) {
            double[] ipCoords = geoIpService.resolveCoordinates(clientIpResolver.resolve(request));
            if (ipCoords != null && ipCoords.length == 2) {
                useLat = ipCoords[0];
                useLng = ipCoords[1];
            }
        }
        return ApiResponse.success(placesSearchService.suggestions(useLat, useLng, limit));
    }
}
