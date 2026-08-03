package com.vibely.backend.enhancement;

public record EnhanceProgressRequest(
    Integer progressPct,
    String progressStage,
    String progressDetail,
    String checkpointJson,
    String state
) {}
