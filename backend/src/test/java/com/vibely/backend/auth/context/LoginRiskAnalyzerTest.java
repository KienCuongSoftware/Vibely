package com.vibely.backend.auth.context;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class LoginRiskAnalyzerTest {

    private final LoginRiskAnalyzer analyzer = new LoginRiskAnalyzer();

    @Test
    void reportsSuspiciousChangesAgainstRecentHistory() {
        LoginContext current = new LoginContext();
        current.setFingerprint("new-device");
        current.setBrowser("Safari");
        current.setCountry("Singapore");
        current.setDistrict("Quận 7");
        current.setIpAddress("203.0.113.10");

        UserLoginHistory previous = new UserLoginHistory();
        previous.setFingerprint("old-device");
        previous.setBrowser("Chrome");
        previous.setCountry("Vietnam");
        previous.setDistrict("Quận 1");
        previous.setIpAddress("113.161.1.2");

        LoginRiskResult result = analyzer.analyze(current, List.of(previous));

        assertThat(result.suspicious()).isTrue();
        assertThat(result.reasons())
            .contains("Thiết bị mới", "Trình duyệt mới", "Quốc gia mới", "Khu vực mới", "Địa chỉ IP mới");
    }

    @Test
    void ignoresFirstLogin() {
        LoginRiskResult result = analyzer.analyze(new LoginContext(), List.of());

        assertThat(result.suspicious()).isFalse();
    }
}
