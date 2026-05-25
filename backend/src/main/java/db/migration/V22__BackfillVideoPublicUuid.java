package db.migration;

import com.vibely.backend.common.UuidV7;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Backfill UUIDv7 public_id for existing videos, then enforce NOT NULL. */
public class V22__BackfillVideoPublicUuid extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (Statement select = connection.createStatement();
             ResultSet rows = select.executeQuery("SELECT id FROM videos WHERE public_id IS NULL")) {
            try (PreparedStatement update = connection.prepareStatement(
                "UPDATE videos SET public_id = ? WHERE id = ?")) {
                while (rows.next()) {
                    UUID publicId = UuidV7.generate();
                    update.setObject(1, publicId);
                    update.setLong(2, rows.getLong("id"));
                    update.addBatch();
                }
                update.executeBatch();
            }
        }

        try (Statement ddl = connection.createStatement()) {
            ddl.execute("ALTER TABLE videos ALTER COLUMN public_id SET NOT NULL");
        }
    }
}
