package com.vibely.backend.share;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ShortLinkRedirectController {

    private final RedirectService redirectService;

    public ShortLinkRedirectController(RedirectService redirectService) {
        this.redirectService = redirectService;
    }

    @GetMapping("/v/{shortCode}")
    public void redirect(
        @PathVariable String shortCode,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        redirectService.redirectShortCode(shortCode, request, response);
    }
}
