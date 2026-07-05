package com.vibely.backend.auth.oauth;

/** Browser OAuth paths under {@code /api} so production nginx can proxy without extra location blocks. */
public final class OAuth2WebPaths {

    public static final String AUTHORIZATION_BASE_URI = "/api/oauth2/authorization";
    public static final String LOGIN_PROCESSING_URI = "/api/login/oauth2/code/*";

    private OAuth2WebPaths() {}

    public static String callbackUri(String publicBaseUrl, String registrationId) {
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/api/login/oauth2/code/" + registrationId;
    }
}
