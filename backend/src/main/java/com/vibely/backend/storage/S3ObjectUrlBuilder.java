package com.vibely.backend.storage;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Builds HTTPS URLs for objects in the configured bucket (CloudFront base or virtual-hosted S3 URL).
 */
@Component
public class S3ObjectUrlBuilder {

    private static final Pattern VIRTUAL_HOSTED = Pattern.compile(
        "https://([^.]+)\\.s3(?:\\.[^.]+)?\\.amazonaws\\.com/(.+)",
        Pattern.CASE_INSENSITIVE
    );

    /** Path-style regional: {@code https://s3.<region>.amazonaws.com/<bucket>/<key>}. */
    private static final Pattern PATH_STYLE_REGIONAL = Pattern.compile(
        "https://s3\\.([^.]+)\\.amazonaws\\.com/([^/]+)/(.+)",
        Pattern.CASE_INSENSITIVE
    );

    /** Path-style legacy: {@code https://s3.amazonaws.com/<bucket>/<key>}. */
    private static final Pattern PATH_STYLE_LEGACY = Pattern.compile(
        "https://s3\\.amazonaws\\.com/([^/]+)/(.+)",
        Pattern.CASE_INSENSITIVE
    );

    private final S3Properties properties;

    public S3ObjectUrlBuilder(S3Properties properties) {
        this.properties = properties;
    }

    public String toPublicHttpsUrl(String key) {
        String base = properties.getPublicUrlBase();
        if (base != null && !base.isBlank()) {
            String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
            return normalized + "/" + encodeKeyForUrl(key);
        }
        String bucket = properties.getBucket();
        String region = properties.getRegion();
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + encodeKeyForUrl(key);
    }

    /**
     * Resolves bucket + object key from a playback URL (CloudFront base, virtual-hosted, or path-style S3).
     */
    public Optional<ResolvedS3Object> resolveObjectFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        String trimmed = url.trim();
        String configuredBucket = properties.getBucket();
        if (configuredBucket == null || configuredBucket.isBlank()) {
            return Optional.empty();
        }
        String base = properties.getPublicUrlBase();
        if (base != null && !base.isBlank()) {
            String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base.toLowerCase(Locale.ROOT);
            String lower = trimmed.toLowerCase(Locale.ROOT);
            if (lower.startsWith(normalized + "/") || lower.equals(normalized)) {
                String path = trimmed.substring(normalized.length());
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                path = stripQueryAndFragment(path);
                return Optional.of(new ResolvedS3Object(configuredBucket, decodeKeyPath(path)));
            }
        }
        Matcher m = VIRTUAL_HOSTED.matcher(trimmed);
        if (m.matches()) {
            String bucket = m.group(1);
            if (bucket.equalsIgnoreCase(configuredBucket)) {
                String keyPart = stripQueryAndFragment(m.group(2));
                return Optional.of(new ResolvedS3Object(bucket, decodeKeyPath(keyPart)));
            }
        }
        Matcher pathRegional = PATH_STYLE_REGIONAL.matcher(trimmed);
        if (pathRegional.matches()) {
            String bucket = pathRegional.group(2);
            if (bucket.equalsIgnoreCase(configuredBucket)) {
                String keyPart = stripQueryAndFragment(pathRegional.group(3));
                return Optional.of(new ResolvedS3Object(bucket, decodeKeyPath(keyPart)));
            }
        }
        Matcher pathLegacy = PATH_STYLE_LEGACY.matcher(trimmed);
        if (pathLegacy.matches()) {
            String bucket = pathLegacy.group(1);
            if (bucket.equalsIgnoreCase(configuredBucket)) {
                String keyPart = stripQueryAndFragment(pathLegacy.group(2));
                return Optional.of(new ResolvedS3Object(bucket, decodeKeyPath(keyPart)));
            }
        }
        return Optional.empty();
    }

    /**
     * Resolves S3 object key from a playback URL produced by this app, or from virtual-hosted S3 URLs.
     */
    public Optional<String> resolveKeyFromUrl(String url) {
        return resolveObjectFromUrl(url).map(ResolvedS3Object::key);
    }

    private static String stripQueryAndFragment(String raw) {
        int end = raw.length();
        int q = raw.indexOf('?');
        int h = raw.indexOf('#');
        if (q >= 0) {
            end = Math.min(end, q);
        }
        if (h >= 0) {
            end = Math.min(end, h);
        }
        return raw.substring(0, end);
    }

    private static String decodeKeyPath(String path) {
        String[] parts = path.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append('/');
            }
            sb.append(URLDecoder.decode(parts[i], StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private static String encodeKeyForUrl(String key) {
        String[] parts = key.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append('/');
            }
            sb.append(URLEncoder.encode(parts[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return sb.toString();
    }
}
