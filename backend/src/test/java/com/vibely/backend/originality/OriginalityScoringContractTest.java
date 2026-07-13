package com.vibely.backend.originality;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class OriginalityScoringContractTest {

    @Test
    void policyVersionDefaultIsV1() {
        OriginalityProperties props = new OriginalityProperties();
        assertEquals("v1", props.getPolicyVersion());
    }

    @Test
    void decisionsMatchEnumNamesUsedByWorker() {
        assertEquals("ALLOW", OriginalityDecision.ALLOW.name());
        assertEquals("REVIEW", OriginalityDecision.REVIEW.name());
        assertEquals("LIMIT_DISTRIBUTION", OriginalityDecision.LIMIT_DISTRIBUTION.name());
        assertEquals("BLOCK", OriginalityDecision.BLOCK.name());
    }
}
