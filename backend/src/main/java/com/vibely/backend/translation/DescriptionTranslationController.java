package com.vibely.backend.translation;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(DescriptionTranslationController.class);

    private final DescriptionTranslationService translationService;

    public DescriptionTranslationController(DescriptionTranslationService translationService) {
        this.translationService = translationService;
    }

    /** Enqueue + try sync translate. */
    @PostMapping("/{publicId}/description-translation")
    public DescriptionTranslationResponse requestTranslation(
        @PathVariable UUID publicId,
        @RequestBody(required = false) DescriptionTranslationRequest body
    ) {
        try {
            String targetLang = body == null ? null : body.targetLang();
            return translationService.getOrRequest(publicId, targetLang);
        } catch (NotFoundException | BadRequestException ex) {
            throw ex;
        } catch (Throwable ex) {
            log.error("description-translation POST failed publicId={}: {}", publicId, ex.toString(), ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            return DescriptionTranslationResponse.failed(truncate(msg, 500));
        }
    }

    /**
     * Status poll (default). Pass {@code request=true} to enqueue/sync without POST
     * (avoids CSRF / some proxy POST failures).
     */
    @GetMapping("/{publicId}/description-translation")
    public DescriptionTranslationResponse getTranslation(
        @PathVariable UUID publicId,
        @RequestParam String targetLang,
        @RequestParam(defaultValue = "false") boolean request
    ) {
        try {
            if (request) {
                return translationService.getOrRequest(publicId, targetLang);
            }
            return translationService.getStatus(publicId, targetLang);
        } catch (NotFoundException | BadRequestException ex) {
            throw ex;
        } catch (Throwable ex) {
            log.error("description-translation GET failed publicId={}: {}", publicId, ex.toString(), ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            return DescriptionTranslationResponse.failed(truncate(msg, 500));
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
