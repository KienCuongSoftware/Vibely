package com.vibely.backend.discovery.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.model.VideoEmbedding;
import com.vibely.backend.discovery.openai.OpenAiHttpClient;
import com.vibely.backend.discovery.repository.VideoEmbeddingRepository;
import com.vibely.backend.video.Video;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpenAiEmbeddingService {
    private static final Logger log = LoggerFactory.getLogger(OpenAiEmbeddingService.class);

    private final DiscoveryProperties properties;
    private final OpenAiHttpClient openAiHttpClient;
    private final VideoEmbeddingRepository videoEmbeddingRepository;
    private final ObjectMapper objectMapper;

    public OpenAiEmbeddingService(
        DiscoveryProperties properties,
        OpenAiHttpClient openAiHttpClient,
        VideoEmbeddingRepository videoEmbeddingRepository,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.openAiHttpClient = openAiHttpClient;
        this.videoEmbeddingRepository = videoEmbeddingRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void indexVideoEmbedding(Video video, List<String> hashtags) {
        indexVideoEmbedding(video, hashtags, null, null);
    }

    @Transactional
    public void indexVideoEmbedding(
        Video video,
        List<String> hashtags,
        String transcript,
        String ocrText
    ) {
        String sourceText = buildSourceText(video.getTitle(), video.getDescription(), hashtags, transcript, ocrText);
        String hash = sha256(sourceText);
        var existing = videoEmbeddingRepository.findByVideoId(video.getId());
        if (existing.isPresent() && hash.equals(existing.get().getSourceTextHash())) {
            return;
        }
        float[] vector;
        if (properties.hasOpenAiCredentials()) {
            try {
                vector = openAiHttpClient.createEmbedding(sourceText);
            } catch (Exception ex) {
                log.warn("OpenAI embedding failed for video {}: {}", video.getId(), ex.getMessage());
                vector = pseudoEmbedding(sourceText, properties.getEmbeddingDimensions());
            }
        } else {
            vector = pseudoEmbedding(sourceText, properties.getEmbeddingDimensions());
        }
        VideoEmbedding row = existing.orElseGet(VideoEmbedding::new);
        row.setVideo(video);
        row.setModel(properties.hasOpenAiCredentials() ? properties.getEmbeddingModel() : "pseudo-v1");
        row.setDimensions(vector.length);
        row.setEmbeddingJson(toJson(vector));
        row.setSourceTextHash(hash);
        videoEmbeddingRepository.save(row);
    }

    static String buildSourceText(String title, String description, List<String> hashtags) {
        return buildSourceText(title, description, hashtags, null, null);
    }

    static String buildSourceText(
        String title,
        String description,
        List<String> hashtags,
        String transcript,
        String ocrText
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("title: ").append(nullSafe(title)).append('\n');
        sb.append("description: ").append(nullSafe(description)).append('\n');
        sb.append("hashtags: ").append(hashtags == null ? "" : String.join(" ", hashtags));
        if (transcript != null && !transcript.isBlank()) {
            sb.append('\n').append("transcript: ").append(transcript.trim());
        }
        if (ocrText != null && !ocrText.isBlank()) {
            sb.append('\n').append("ocr: ").append(ocrText.trim());
        }
        return sb.toString();
    }

    static float[] pseudoEmbedding(String text, int dimensions) {
        float[] vector = new float[dimensions];
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        for (int i = 0; i < dimensions; i++) {
            int b = bytes.length == 0 ? 0 : bytes[i % bytes.length];
            vector[i] = ((b + i * 31) % 1000) / 1000.0f;
        }
        normalize(vector);
        return vector;
    }

    private String toJson(float[] vector) {
        try {
            return objectMapper.writeValueAsString(vector);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static void normalize(float[] vector) {
        double sum = 0;
        for (float v : vector) {
            sum += v * v;
        }
        double norm = Math.sqrt(sum);
        if (norm <= 0) {
            return;
        }
        for (int i = 0; i < vector.length; i++) {
            vector[i] = (float) (vector[i] / norm);
        }
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
