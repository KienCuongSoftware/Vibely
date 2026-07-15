package com.vibely.backend.moderation;

import jakarta.validation.constraints.NotBlank;
import java.util.Locale;

public class AdminModerationResolveRequest {

    @NotBlank
    private String decision;

    private String reasonCode;
    private String reasonText;

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }

    public String getReasonText() {
        return reasonText;
    }

    public void setReasonText(String reasonText) {
        this.reasonText = reasonText;
    }

    public ModerationDecision parsedDecision() {
        return ModerationDecision.valueOf(decision.trim().toUpperCase(Locale.ROOT));
    }
}
