package com.vibely.backend.moderation;

import jakarta.validation.constraints.NotBlank;
import java.util.Locale;

public class AdminModerationAppealResolveRequest {

    @NotBlank
    private String outcome; // UPHELD | SOFTENED | RESTORED | REJECTED

    @NotBlank
    private String decision; // effective decision after resolve

    private String notes;

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String normalizedOutcome() {
        return outcome.trim().toUpperCase(Locale.ROOT);
    }

    public ModerationDecision parsedDecision() {
        return ModerationDecision.valueOf(decision.trim().toUpperCase(Locale.ROOT));
    }
}
