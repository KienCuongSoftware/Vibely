package com.vibely.backend.share.redis;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.redis")
public class RedisShareProperties {

    private boolean enabled;
    private String keyPrefix = "vibely";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public String prefixed(String suffix) {
        String prefix = keyPrefix == null ? "" : keyPrefix.trim();
        if (prefix.isEmpty()) {
            return suffix;
        }
        return prefix + ":" + suffix;
    }
}
