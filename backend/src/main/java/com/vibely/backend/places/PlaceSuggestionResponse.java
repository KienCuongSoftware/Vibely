package com.vibely.backend.places;

public record PlaceSuggestionResponse(
    String placeId,
    String name,
    String address,
    Double lat,
    Double lng
) {
}
