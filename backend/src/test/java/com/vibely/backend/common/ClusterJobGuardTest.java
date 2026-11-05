package com.vibely.backend.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.concurrent.atomic.AtomicInteger;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;

class ClusterJobGuardTest {

    @Test
    void runsTheJobOnH2BecauseAdvisoryLocksAreUnavailable() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:cluster-job-guard;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource.setUser("sa");
        dataSource.setPassword("");
        AtomicInteger runs = new AtomicInteger();

        new ClusterJobGuard(dataSource).runExclusive("live-recording", runs::incrementAndGet);

        assertEquals(1, runs.get());
    }

    @Test
    void lockKeysDifferByJobName() {
        assertNotEquals(ClusterJobGuard.lockKey("live-recording"), ClusterJobGuard.lockKey("live-limits"));
    }
}
