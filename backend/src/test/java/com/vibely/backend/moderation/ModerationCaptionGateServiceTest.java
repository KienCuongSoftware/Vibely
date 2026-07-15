package com.vibely.backend.moderation;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.admin.AdminAccountBanEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

class ModerationCaptionGateServiceTest {

    private ModerationCaptionGateService gate;

    @BeforeEach
    void setUp() {
        ModerationProperties props = new ModerationProperties();
        props.setEnabled(true);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        gate = new ModerationCaptionGateService(
            props,
            jdbc,
            new ObjectMapper(),
            mock(ModerationAutoBanService.class),
            mock(AdminAccountBanEmailService.class),
            mock(PlatformTransactionManager.class)
        );
    }

    @Test
    void detectsFollowForAndOfNudes() {
        assertNotNull(gate.firstSevereHit("follow for nudes", null));
        assertNotNull(gate.firstSevereHit("Follow For Nudes !!!", ""));
        assertNotNull(gate.firstSevereHit("Follow of nudes", null));
        assertNotNull(gate.firstSevereHit("follow 4 nudes", null));
        assertNull(gate.firstSevereHit("follow me for fun", null));
    }
}
