package com.vibely.backend.discovery.dto;

public record VideoMediaSignals(String transcript, String ocrText) {
    public static VideoMediaSignals empty() {
        return new VideoMediaSignals("", "");
    }

    public boolean hasContent() {
        return (transcript != null && !transcript.isBlank()) || (ocrText != null && !ocrText.isBlank());
    }
}
