package com.vibely.backend.discovery.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.discovery.dto.VideoMediaSignals;
import org.junit.jupiter.api.Test;

class ContentUnderstandingOrchestratorTest {

    @Test
    void enrichDescriptionAppendsTranscriptAndOcr() {
        String enriched = ContentUnderstandingOrchestrator.enrichDescription(
            "caption",
            new VideoMediaSignals("xin chao cac ban", "Subscribe now")
        );

        assertThat(enriched).contains("caption");
        assertThat(enriched).contains("[transcript] xin chao cac ban");
        assertThat(enriched).contains("[on-screen] Subscribe now");
    }
}
