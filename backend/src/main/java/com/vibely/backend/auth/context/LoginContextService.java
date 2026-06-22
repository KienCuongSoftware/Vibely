package com.vibely.backend.auth.context;

import com.vibely.backend.antibot.dto.DeviceFingerprintPayload;
import com.vibely.backend.auth.LoginContextRequest;
import com.vibely.backend.user.User;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.StringJoiner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@SuppressWarnings("null")
public class LoginContextService {

    private final ClientIpResolver clientIpResolver;
    private final DeviceDetectionService deviceDetectionService;
    private final GeoIpService geoIpService;
    private final ReverseGeocodingService reverseGeocodingService;
    private final UserLoginHistoryRepository loginHistoryRepository;
    private final LoginRiskAnalyzer loginRiskAnalyzer;
    private final SecurityLoginEmailService securityLoginEmailService;

    public LoginContextService(
        ClientIpResolver clientIpResolver,
        DeviceDetectionService deviceDetectionService,
        GeoIpService geoIpService,
        ReverseGeocodingService reverseGeocodingService,
        UserLoginHistoryRepository loginHistoryRepository,
        LoginRiskAnalyzer loginRiskAnalyzer,
        SecurityLoginEmailService securityLoginEmailService
    ) {
        this.clientIpResolver = clientIpResolver;
        this.deviceDetectionService = deviceDetectionService;
        this.geoIpService = geoIpService;
        this.reverseGeocodingService = reverseGeocodingService;
        this.loginHistoryRepository = loginHistoryRepository;
        this.loginRiskAnalyzer = loginRiskAnalyzer;
        this.securityLoginEmailService = securityLoginEmailService;
    }

    @Transactional
    public void recordSuccessfulLogin(User user, HttpServletRequest request, LoginContextRequest contextRequest) {
        LoginContext context = buildContext(request, contextRequest);
        var previousLogins = loginHistoryRepository.findTop10ByUserIdOrderByLoginTimeDesc(user.getId());
        LoginRiskResult risk = loginRiskAnalyzer.analyze(context, previousLogins);
        if (risk.suspicious()) {
            securityLoginEmailService.sendSuspiciousLoginAlert(user, context, risk);
        }
        loginHistoryRepository.save(toEntity(user, context));
    }

    public LoginContext buildContext(HttpServletRequest request, LoginContextRequest contextRequest) {
        LoginContext context = new LoginContext();
        DeviceFingerprintPayload fingerprint = contextRequest == null ? null : contextRequest.getFingerprint();
        String userAgent = firstNonBlank(
            fingerprint == null ? null : fingerprint.userAgent(),
            request.getHeader("User-Agent")
        );
        DeviceInfo deviceInfo = deviceDetectionService.detect(
            userAgent,
            fingerprint == null ? null : fingerprint.browserName()
        );
        String ipAddress = clientIpResolver.resolve(request);
        LocationInfo location = resolveLocation(contextRequest, ipAddress);

        context.setIpAddress(ipAddress);
        context.setCountry(valueOrUnknown(location.country()));
        context.setProvince(location.province());
        context.setCity(location.city());
        context.setDistrict(location.district());
        context.setWard(location.ward());
        context.setLatitude(contextRequest == null ? null : contextRequest.getLatitude());
        context.setLongitude(contextRequest == null ? null : contextRequest.getLongitude());
        context.setBrowser(deviceInfo.browser());
        context.setOperatingSystem(deviceInfo.operatingSystem());
        context.setDeviceType(deviceInfo.deviceType());
        context.setFingerprint(resolveFingerprint(contextRequest, request, userAgent));
        return context;
    }

    private LocationInfo resolveLocation(LoginContextRequest contextRequest, String ipAddress) {
        if (contextRequest != null && contextRequest.getLatitude() != null && contextRequest.getLongitude() != null) {
            LocationInfo precise = reverseGeocodingService.resolve(
                contextRequest.getLatitude(),
                contextRequest.getLongitude()
            );
            if (!"Không xác định".equals(precise.country()) || precise.hasPreciseLocation()) {
                return precise;
            }
        }
        return geoIpService.resolve(ipAddress);
    }

    private String resolveFingerprint(
        LoginContextRequest contextRequest,
        HttpServletRequest request,
        String userAgent
    ) {
        String providedHash = contextRequest == null ? null : contextRequest.getFingerprintHash();
        if (providedHash != null && !providedHash.isBlank()) {
            return providedHash.trim();
        }
        String headerHash = request.getHeader("X-Device-Hash");
        if (headerHash != null && !headerHash.isBlank()) {
            return headerHash.trim();
        }
        DeviceFingerprintPayload fingerprint = contextRequest == null ? null : contextRequest.getFingerprint();
        StringJoiner joiner = new StringJoiner("|");
        if (fingerprint != null) {
            joiner.add(safe(fingerprint.browserName()));
            joiner.add(safe(fingerprint.userAgent()));
            joiner.add(safe(fingerprint.platform()));
            joiner.add(safe(fingerprint.language()));
            joiner.add(safe(fingerprint.timezone()));
            joiner.add(String.valueOf(fingerprint.screenWidth()));
            joiner.add(String.valueOf(fingerprint.screenHeight()));
            joiner.add(safe(fingerprint.canvasHash()));
            joiner.add(safe(fingerprint.webglRenderer()));
            joiner.add(safe(fingerprint.audioHash()));
        } else {
            joiner.add(safe(userAgent));
            joiner.add(safe(request.getHeader("Accept-Language")));
        }
        return sha256(joiner.toString());
    }

    private UserLoginHistory toEntity(User user, LoginContext context) {
        UserLoginHistory entity = new UserLoginHistory();
        entity.setUser(user);
        entity.setIpAddress(truncate(context.getIpAddress(), 64));
        entity.setCountry(truncate(context.getCountry(), 120));
        entity.setProvince(truncate(context.getProvince(), 120));
        entity.setCity(truncate(context.getCity(), 120));
        entity.setDistrict(truncate(context.getDistrict(), 120));
        entity.setWard(truncate(context.getWard(), 120));
        entity.setLatitude(context.getLatitude());
        entity.setLongitude(context.getLongitude());
        entity.setBrowser(truncate(context.getBrowser(), 80));
        entity.setOperatingSystem(truncate(context.getOperatingSystem(), 80));
        entity.setDeviceType(truncate(context.getDeviceType(), 40));
        entity.setFingerprint(truncate(context.getFingerprint(), 128));
        return entity;
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "Không xác định" : value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
