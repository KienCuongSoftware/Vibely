package com.vibely.backend.auth.context;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
        String cloudflare = firstValid(request.getHeader("CF-Connecting-IP"));
        if (cloudflare != null) {
            return cloudflare;
        }

        String forwardedFor = firstValidForwardedFor(request.getHeader("X-Forwarded-For"));
        if (forwardedFor != null) {
            return forwardedFor;
        }

        String realIp = firstValid(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return realIp;
        }

        return normalize(request.getRemoteAddr());
    }

    private String firstValidForwardedFor(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (String part : value.split(",")) {
            String normalized = firstValid(part);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private String firstValid(String value) {
        String normalized = normalize(value);
        if (normalized == null || "unknown".equalsIgnoreCase(normalized)) {
            return null;
        }
        return normalized;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim()
            .replace("[", "")
            .replace("]", "");
    }
}
