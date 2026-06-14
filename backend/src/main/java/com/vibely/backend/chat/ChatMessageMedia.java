package com.vibely.backend.chat;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.storage.S3OwnedMediaValidator;

public final class ChatMessageMedia {

    public static final String IMAGE_PREFIX = "__img__:";
    public static final String VIDEO_PREFIX = "__vid__:";

    private ChatMessageMedia() {}

    public enum Type {
        TEXT,
        IMAGE,
        VIDEO
    }

    public record Parsed(Type type, String content, String mediaUrl, String caption) {}

    public static Parsed parse(String rawContent) {
        String normalized = String.valueOf(rawContent).trim();
        if (normalized.startsWith(IMAGE_PREFIX)) {
            String url = normalized.substring(IMAGE_PREFIX.length()).trim();
            return new Parsed(Type.IMAGE, normalized, url, "");
        }
        if (normalized.startsWith(VIDEO_PREFIX)) {
            String payload = normalized.substring(VIDEO_PREFIX.length()).trim();
            String[] lines = payload.split("\\R", 2);
            String url = lines.length > 0 ? lines[0].trim() : "";
            String caption = lines.length > 1 ? lines[1].trim() : "";
            return new Parsed(Type.VIDEO, normalized, url, caption);
        }
        return new Parsed(Type.TEXT, normalized, null, null);
    }

    public static Parsed validateOutgoing(String rawContent, long senderUserId, S3OwnedMediaValidator mediaValidator) {
        Parsed parsed = parse(rawContent);
        if (parsed.type() == Type.TEXT) {
            if (rawContent.contains(IMAGE_PREFIX) || rawContent.contains(VIDEO_PREFIX)) {
                throw new BadRequestException("Định dạng media tin nhắn không hợp lệ.");
            }
            return parsed;
        }
        if (parsed.mediaUrl() == null || parsed.mediaUrl().isBlank()) {
            throw new BadRequestException("URL media tin nhắn là bắt buộc.");
        }
        mediaValidator.requireOwnedChatMedia(parsed.mediaUrl(), senderUserId);
        return parsed;
    }
}
