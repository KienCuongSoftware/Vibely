package com.vibely.backend.antibot.reputation;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import com.vibely.backend.antibot.security.AntiBotHashing;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class IpReputationService {

    private static final List<String> DATACENTER_PREFIXES = List.of(
        "34.", "35.", "52.", "104.", "138.", "139.", "146.", "157.", "167.", "178."
    );

    private final AntiBotProperties properties;
    private final StringRedisTemplate redis;
    private final Map<String, Integer> memoryCache = new ConcurrentHashMap<>();

    public IpReputationService(
        AntiBotProperties properties,
        @Autowired(required = false) StringRedisTemplate shareStringRedisTemplate
    ) {
        this.properties = properties;
        this.redis = shareStringRedisTemplate;
    }

    public int score(HttpServletRequest request) {
        String ip = clientIp(request);
        return scoreIp(ip, request);
    }

    public int scoreIp(String ip, HttpServletRequest request) {
        if (ip == null || ip.isBlank()) {
            return 35;
        }
        int cached = readCache(ip);
        if (cached > 0) {
            return cached;
        }

        int score = 60;
        if (isPrivateIp(ip)) {
            score = 75;
        }
        if (isDatacenterHeuristic(ip)) {
            score -= 18;
        }

        Integer wafScore = parseWafBotScore(request);
        if (wafScore != null) {
            // Lower WAF bot score => lower reputation.
            score = Math.min(score, Math.max(5, wafScore));
        }

        String threat = request == null ? null : request.getHeader("X-Threat-Score");
        if (threat != null) {
            try {
                int threatScore = Integer.parseInt(threat.trim());
                score = Math.min(score, Math.max(5, 100 - threatScore));
            } catch (NumberFormatException ignored) {
                // ignore malformed header
            }
        }

        score = Math.max(5, Math.min(100, score));
        writeCache(ip, score);
        return score;
    }

    public void penalize(String ip, int delta) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        int current = scoreIp(ip, null);
        writeCache(ip, Math.max(5, current - delta));
    }

    private Integer parseWafBotScore(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String raw = firstNonBlank(
            request.getHeader("X-Bot-Score"),
            request.getHeader("CF-Bot-Score"),
            request.getHeader("X-Cloudflare-Bot-Score")
        );
        if (raw == null) {
            return null;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private boolean isPrivateIp(String ip) {
        return ip.startsWith("10.")
            || ip.startsWith("192.168.")
            || ip.equals("127.0.0.1")
            || ip.equals("::1");
    }

    private boolean isDatacenterHeuristic(String ip) {
        return DATACENTER_PREFIXES.stream().anyMatch(ip::startsWith);
    }

    private int readCache(String ip) {
        String hash = AntiBotHashing.sha256Hex(ip);
        String redisKey = properties.prefixed(AntiBotRedisKeys.IP_REPUTATION + hash);
        if (redis != null) {
            String raw = redis.opsForValue().get(redisKey);
            if (raw == null) {
                return 0;
            }
            try {
                return Integer.parseInt(raw);
            } catch (NumberFormatException ex) {
                return 0;
            }
        }
        return memoryCache.getOrDefault(hash, 0);
    }

    private void writeCache(String ip, int score) {
        String hash = AntiBotHashing.sha256Hex(ip);
        String redisKey = properties.prefixed(AntiBotRedisKeys.IP_REPUTATION + hash);
        if (redis != null) {
            redis.opsForValue().set(redisKey, String.valueOf(score), Duration.ofHours(1));
            return;
        }
        memoryCache.put(hash, score);
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
