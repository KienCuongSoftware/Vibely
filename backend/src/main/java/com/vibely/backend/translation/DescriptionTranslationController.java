package com.vibely.backend.translation;

import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class DescriptionTranslationController {

    private final DescriptionTranslationService translationService;

    public DescriptionTranslationController(DescriptionTranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping("/{publicId}/description-translation")
    public DescriptionTranslationResponse requestTranslation(
        @PathVariable UUID publicId,
        @RequestBody(required = false) DescriptionTranslationRequest body
    ) {
        String targetLang = body == null ? null : body.targetLang();
        return translationService.getOrRequest(publicId, targetLang);
    }

    @GetMapping("/{publicId}/description-translation")
    public DescriptionTranslationResponse getTranslation(
        @PathVariable UUID publicId,
        @RequestParam String targetLang
    ) {
        return translationService.getStatus(publicId, targetLang);
    }
}
