package com.vibely.backend.chat;

public record ChatSocketEvent(
    String type,
    Object payload
) {}
