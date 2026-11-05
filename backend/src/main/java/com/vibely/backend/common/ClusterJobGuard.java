package com.vibely.backend.common;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Runs a short job on one backend at a time. PostgreSQL advisory locks are session-scoped, so the
 * same connection locks and unlocks. H2 (tests) has no advisory locks and runs the job locally.
 * The job must stay short: claim work, do not transcode while holding the connection.
 */
@Component
public class ClusterJobGuard {

    private static final Logger log = LoggerFactory.getLogger(ClusterJobGuard.class);

    private final DataSource dataSource;

    public ClusterJobGuard(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void runExclusive(String name, Runnable job) {
        try (Connection connection = dataSource.getConnection()) {
            if (!isPostgres(connection)) {
                job.run();
                return;
            }
            long key = lockKey(name);
            if (!tryLock(connection, key)) {
                log.debug("cluster.job.skipped name={}", name);
                return;
            }
            try {
                job.run();
            } finally {
                unlock(connection, key);
            }
        } catch (SQLException ex) {
            log.warn("cluster.job.lock_failed name={} error={}", name, ex.getClass().getSimpleName());
        }
    }

    static long lockKey(String name) {
        long hash = 1125899906842597L;
        for (int i = 0; i < name.length(); i++) {
            hash = 31 * hash + name.charAt(i);
        }
        return hash;
    }

    private static boolean isPostgres(Connection connection) throws SQLException {
        return "PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName());
    }

    private static boolean tryLock(Connection connection, long key) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            statement.setLong(1, key);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() && rows.getBoolean(1);
            }
        }
    }

    private static void unlock(Connection connection, long key) {
        try (PreparedStatement statement = connection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
            statement.setLong(1, key);
            statement.execute();
        } catch (SQLException ex) {
            log.warn("cluster.job.unlock_failed error={}", ex.getClass().getSimpleName());
        }
    }
}
