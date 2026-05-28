package com.vibely.backend.auth.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mail")
public class OtpMailProperties {

    private boolean enabled;
    private String from = "noreply@vibely.app";
    private String fromName = "Vibely";
    private boolean exposeCodeInApi = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public boolean isExposeCodeInApi() {
        return exposeCodeInApi;
    }

    public void setExposeCodeInApi(boolean exposeCodeInApi) {
        this.exposeCodeInApi = exposeCodeInApi;
    }
}
