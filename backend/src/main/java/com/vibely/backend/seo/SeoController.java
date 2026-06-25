package com.vibely.backend.seo;

import java.nio.charset.StandardCharsets;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SeoController {

    private final SitemapService sitemapService;

    public SeoController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robotsTxt() {
        return ResponseEntity.ok()
            .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
            .cacheControl(CacheControl.noCache())
            .body(sitemapService.robotsTxt());
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemapXml() {
        return ResponseEntity.ok()
            .contentType(new MediaType(MediaType.APPLICATION_XML, StandardCharsets.UTF_8))
            .cacheControl(CacheControl.noCache())
            .body(sitemapService.sitemapXml());
    }
}
