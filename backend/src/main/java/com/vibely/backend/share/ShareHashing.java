package com.vibely.backend.share;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

public final class ShareHashing {

    private ShareHashing() {}

    public static String sha256Hex(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    /** Daily-rotating visitor fingerprint without storing raw IP in analytics tables. */
    public static String visitorKey(String ipHash, String userAgentHash, String dailySalt) {
        return sha256Hex(String.join("|",
            ipHash == null ? "" : ipHash,
            userAgentHash == null ? "" : userAgentHash,
            dailySalt == null ? "" : dailySalt
        ));
    }
}
