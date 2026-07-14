package com.vibely.backend.video;

public enum VideoPrivacy {
    /** Everyone can watch (and appears in discovery). */
    PUBLIC,
    /** Mutual followers (both follow each other). */
    FRIENDS,
    /** Author only. */
    PRIVATE;

    public static VideoPrivacy fromApi(String raw) {
        if (raw == null || raw.isBlank()) {
            return PUBLIC;
        }
        String key = raw.trim().toUpperCase();
        return switch (key) {
            case "PUBLIC", "EVERYONE" -> PUBLIC;
            case "FRIENDS" -> FRIENDS;
            case "PRIVATE", "ONLY_YOU", "ONLYYOU", "ONLY_ME", "ONLYME" -> PRIVATE;
            default -> PUBLIC;
        };
    }

    /** Frontend Studio values: everyone | friends | onlyYou */
    public static VideoPrivacy fromStudioUi(String raw) {
        if (raw == null || raw.isBlank()) {
            return PUBLIC;
        }
        return switch (raw.trim()) {
            case "friends" -> FRIENDS;
            case "onlyYou", "only_you", "private" -> PRIVATE;
            default -> PUBLIC;
        };
    }

    public String toStudioUi() {
        return switch (this) {
            case FRIENDS -> "friends";
            case PRIVATE -> "onlyYou";
            case PUBLIC -> "everyone";
        };
    }
}
