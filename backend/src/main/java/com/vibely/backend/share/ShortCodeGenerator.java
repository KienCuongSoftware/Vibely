package com.vibely.backend.share;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public class ShortCodeGenerator {

    private static final char[] BASE62 =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();

    private final SecureRandom random = new SecureRandom();
    private final ShareProperties shareProperties;
    private final ShortLinkRepository shortLinkRepository;

    public ShortCodeGenerator(ShareProperties shareProperties, ShortLinkRepository shortLinkRepository) {
        this.shareProperties = shareProperties;
        this.shortLinkRepository = shortLinkRepository;
    }

    public String generateUnique() {
        int length = Math.max(6, Math.min(12, shareProperties.getShortCodeLength()));
        for (int attempt = 0; attempt < 12; attempt++) {
            String code = randomBase62(length);
            if (!shortLinkRepository.existsByShortCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Unable to allocate unique short code");
    }

    private String randomBase62(int length) {
        char[] buf = new char[length];
        for (int i = 0; i < length; i++) {
            buf[i] = BASE62[random.nextInt(BASE62.length)];
        }
        return new String(buf);
    }
}
