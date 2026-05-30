package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.service.EmbeddingSimilarityService;
import org.junit.jupiter.api.Test;

class EmbeddingSimilarityServiceTest {
    private final EmbeddingSimilarityService service = new EmbeddingSimilarityService(new ObjectMapper());

    @Test
    void identicalVectorsScoreOne() {
        String vector = "[1.0,0.0,0.0]";
        assertThat(service.cosineSimilarity(vector, vector)).isEqualTo(1.0);
    }

    @Test
    void orthogonalVectorsScoreZero() {
        assertThat(service.cosineSimilarity("[1,0,0]", "[0,1,0]")).isEqualTo(0.0);
    }
}
