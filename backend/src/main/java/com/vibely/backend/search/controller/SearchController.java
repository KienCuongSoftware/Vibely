package com.vibely.backend.search.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.search.dto.SearchHashtagResultDto;
import com.vibely.backend.search.dto.SearchHistoryCreateRequest;
import com.vibely.backend.search.dto.SearchHistoryItemDto;
import com.vibely.backend.search.dto.SearchSuggestResponseDto;
import com.vibely.backend.search.dto.SearchTrendingResponseDto;
import com.vibely.backend.search.dto.SearchUserResultDto;
import com.vibely.backend.search.dto.SearchVideoResultDto;
import com.vibely.backend.search.service.SearchService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/suggest")
    public ApiResponse<SearchSuggestResponseDto> suggest(
        @RequestParam(value = "q", required = false) String q
    ) {
        return ApiResponse.success(searchService.suggest(q));
    }

    @GetMapping("/users")
    public ApiResponse<List<SearchUserResultDto>> users(
        @RequestParam("q") String q,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.success(searchService.searchUsers(q, limit));
    }

    @GetMapping("/videos")
    public ApiResponse<List<SearchVideoResultDto>> videos(
        @RequestParam("q") String q,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.success(searchService.searchVideos(q, limit));
    }

    @GetMapping("/hashtags")
    public ApiResponse<List<SearchHashtagResultDto>> hashtags(
        @RequestParam("q") String q,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.success(searchService.searchHashtags(q, limit));
    }

    @GetMapping("/trending")
    public ApiResponse<SearchTrendingResponseDto> trending(
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.success(searchService.trending(limit));
    }

    @GetMapping("/history")
    public ApiResponse<List<SearchHistoryItemDto>> history(
        Authentication authentication,
        @RequestParam(defaultValue = "30") int limit
    ) {
        return ApiResponse.success(searchService.history(authentication.getName(), limit));
    }

    @PostMapping("/history")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SearchHistoryItemDto> recordHistory(
        Authentication authentication,
        @Valid @RequestBody SearchHistoryCreateRequest request
    ) {
        return ApiResponse.success(searchService.recordHistory(authentication.getName(), request.query()));
    }

    @DeleteMapping("/history")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearHistory(Authentication authentication) {
        searchService.clearHistory(authentication.getName());
    }

    @DeleteMapping("/history/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHistoryItem(
        Authentication authentication,
        @PathVariable Long id
    ) {
        searchService.deleteHistoryItem(authentication.getName(), id);
    }
}
