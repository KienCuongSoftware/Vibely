package com.vibely.backend.auth.context;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LoginRiskAnalyzer {

    public LoginRiskResult analyze(LoginContext current, List<UserLoginHistory> previousLogins) {
        LoginRiskResult result = new LoginRiskResult();
        if (previousLogins == null || previousLogins.isEmpty()) {
            return result;
        }
        if (isNew(current.getFingerprint(), previousLogins.stream().map(UserLoginHistory::getFingerprint).toList())) {
            result.add("Thiết bị mới");
        }
        if (isNew(current.getBrowser(), previousLogins.stream().map(UserLoginHistory::getBrowser).toList())) {
            result.add("Trình duyệt mới");
        }
        if (isNew(current.getCountry(), previousLogins.stream().map(UserLoginHistory::getCountry).toList())) {
            result.add("Quốc gia mới");
        }
        if (isNew(current.getDistrict(), previousLogins.stream().map(UserLoginHistory::getDistrict).toList())) {
            result.add("Khu vực mới");
        }
        if (isNew(current.getIpAddress(), previousLogins.stream().map(UserLoginHistory::getIpAddress).toList())) {
            result.add("Địa chỉ IP mới");
        }
        return result;
    }

    private boolean isNew(String value, List<String> previousValues) {
        if (value == null || value.isBlank() || "Không xác định".equals(value)) {
            return false;
        }
        return previousValues.stream()
            .filter(previous -> previous != null && !previous.isBlank())
            .noneMatch(previous -> previous.equalsIgnoreCase(value));
    }
}
