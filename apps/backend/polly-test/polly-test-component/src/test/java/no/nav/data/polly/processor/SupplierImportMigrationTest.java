package no.nav.data.polly.processor;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "BK_SYSTEM_INFORMATION_TEST_DB", matches = ".+")
class SupplierImportMigrationTest {
    @Test
    void importsAllNamesOncePreservesExistingSuppliersAndKeepsSimilarNamesSeparate() throws Exception {
        try (var connection = DriverManager.getConnection(System.getenv("BK_SYSTEM_INFORMATION_TEST_DB"), "bk_test", "")) {
            connection.setAutoCommit(false);
            try (var sql = connection.createStatement()) {
                // Shadow the application table for this connection only.
                try (var schema = getClass().getResourceAsStream("/db/migration/V1.34__processor.sql")) {
                    sql.execute(new String(schema.readAllBytes(), StandardCharsets.UTF_8)
                            .replace("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE"));
                }
                sql.execute("""
                    INSERT INTO processor (processor_id, data, created_by, created_date)
                    VALUES ('00000000-0000-0000-0000-000000000001',
                            '{"name":"  mIcRoSoFt  ","contract":"Existing contract","note":"Keep me"}', 'Original', now()),
                           ('00000000-0000-0000-0000-000000000002',
                            '{"name":"An existing supplier"}', 'Original', now())
                    """);
                runImport(connection);
                var names = new HashSet<String>();
                var ids = new HashSet<String>();
                var mapper = new ObjectMapper();
                try (var rows = sql.executeQuery("SELECT * FROM processor")) {
                    while (rows.next()) {
                        ids.add(rows.getString("processor_id"));
                        var data = mapper.readTree(rows.getString("data"));
                        names.add(data.path("name").asText());
                        if ("Migration".equals(rows.getString("created_by"))) {
                            assertThat(data.path("contract").asText()).isEmpty();
                            assertThat(data.path("contractOwner").asText()).isEmpty();
                            assertThat(data.path("operationalContractManagers").isArray()).isTrue();
                            assertThat(data.path("operationalContractManagers").isEmpty()).isTrue();
                            assertThat(data.path("countries").isArray()).isTrue();
                            assertThat(data.path("countries").isEmpty()).isTrue();
                            assertThat(data.path("outsideEU").isNull()).isTrue();
                            assertThat(data.path("transferGroundsOutsideEU").isNull()).isTrue();
                            assertThat(rows.getTimestamp("created_date")).isNotNull();
                            assertThat(rows.getString("last_modified_by")).isEqualTo("Migration");
                        } else if (data.path("name").asText().contains("mIcRoSoFt")) {
                            assertThat(rows.getString("processor_id")).isEqualTo("00000000-0000-0000-0000-000000000001");
                            assertThat(data.path("contract").asText()).isEqualTo("Existing contract");
                            assertThat(data.path("note").asText()).isEqualTo("Keep me");
                            assertThat(rows.getString("last_modified_by")).isNull();
                        }
                    }
                }
                // 151 requested names, one already present, plus an unrelated existing supplier.
                assertThat(names).hasSize(152).contains("  mIcRoSoFt  ", "Axiell", "Axiell Norge", "Invera AS", "Invera Tech",
                        "KS", "Fiks KS", "Telenor", "Telenor MBN", "Anytune pro+", "Diagramming Apps, LCC", "Water Copmetence", "Øwre Johnsen")
                        .doesNotContain("Microsoft", "ImageShop ", "Locus ");
                assertThat(ids).hasSize(152);
                runImport(connection);
                Set<String> after = new HashSet<>();
                try (var rows = sql.executeQuery("SELECT processor_id FROM processor")) {
                    while (rows.next()) after.add(rows.getString(1));
                }
                assertThat(after).isEqualTo(ids);
            } finally {
                connection.rollback();
            }
        }
    }

    private void runImport(Connection connection) throws Exception {
        try (var sql = connection.createStatement();
             var migration = getClass().getResourceAsStream("/db/migration/V1.44__import_system_suppliers.sql")) {
            sql.execute(new String(migration.readAllBytes(), StandardCharsets.UTF_8));
        }
    }
}
