package com.vibely.backend.antibot.redis;

public final class AntiBotRedisKeys {

    public static final String CAPTCHA_SESSION = "captcha:";
    public static final String RATE_LIMIT = "rl:";
    public static final String RISK_SESSION = "risk:session:";
    public static final String TRUST_DEVICE = "trust:device:";
    public static final String TRUST_USER = "trust:user:";
    public static final String IP_REPUTATION = "ip:";
    public static final String VERIFICATION = "verify:";

    private AntiBotRedisKeys() {
    }
}
