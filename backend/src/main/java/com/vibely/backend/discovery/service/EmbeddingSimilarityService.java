package com.vibely.backend.discovery.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class EmbeddingSimilarityService {
    private final ObjectMapper objectMapper;

    public EmbeddingSimilarityService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public double cosineSimilarity(String embeddingJsonA, String embeddingJsonB) {
        float[] a = parse(embeddingJsonA);
        float[] b = parse(embeddingJsonB);
        if (a.length == 0 || b.length == 0 || a.length != b.length) {
            return 0;
        }
        double dot = 0;
        double normA = 0;
        double normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA <= 0 || normB <= 0) {
            return 0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private float[] parse(String json) {
        if (json == null || json.isBlank()) {
            return new float[0];
        }
        try {
            List<Double> values = objectMapper.readValue(json, new TypeReference<>() {});
            float[] vector = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                vector[i] = values.get(i).floatValue();
            }
            return vector;
        } catch (Exception ex) {
            return new float[0];
        }
    }
}
