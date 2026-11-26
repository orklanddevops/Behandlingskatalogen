package no.nav.data.polly.systeminformation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "BK_SYSTEM_INFORMATION_TEST_DB", matches = ".+")
class SystemDocumentsMigrationTest {
    @Test
    void movesAgreementsToAllLinkedSystemsAndKeepsUnmappedAgreementsAndOtherDocuments() throws Exception {
        try (var connection = DriverManager.getConnection(System.getenv("BK_SYSTEM_INFORMATION_TEST_DB"), "bk_test", "")) {
            connection.setAutoCommit(false);
            try (var sql = connection.createStatement()) {
                // Temporary tables shadow real tables for this connection only.
                sql.execute("CREATE TEMP TABLE codelist (list_name text, code text)");
                sql.execute("CREATE TEMP TABLE process (process_id uuid, data jsonb, last_modified_by text, last_modified_date timestamp)");
                try (var schema = getClass().getResourceAsStream("/db/migration/V1.39__system_information.sql")) {
                    sql.execute(new String(schema.readAllBytes(), StandardCharsets.UTF_8).replace("CREATE TABLE", "CREATE TEMP TABLE"));
                }
                sql.execute("INSERT INTO codelist VALUES ('SYSTEM', 'ONE'), ('SYSTEM', 'TWO')");
                sql.execute("""
                    INSERT INTO process VALUES
                    ('00000000-0000-0000-0000-000000000001', '{"affiliation":{"products":["ONE","TWO"]},"qualitySystemLinks":{"documents":[{"type":"HOVEDAVTALE","name":"Main","url":"https://example.org/main"},{"type":"ANNEN_AVTALE","name":"Other","url":"https://example.org/other"},{"type":"ROS","name":"Risk","url":"https://example.org/risk"}]}}', null, null),
                    ('00000000-0000-0000-0000-000000000002', '{"qualitySystemLinks":{"documents":[{"type":"HOVEDAVTALE","name":"Unmapped","url":"https://example.org/unmapped"}]}}', null, null),
                    ('00000000-0000-0000-0000-000000000003', '{"affiliation":{"products":["ONE"]},"qualitySystemLinks":{"mainAgreement":"https://example.org/legacy"}}', null, null),
                    ('00000000-0000-0000-0000-000000000004', '{"affiliation":{"products":["ONE"]},"qualitySystemLinks":{"documents":[{"type":"HOVEDAVTALE","name":"Main","url":"https://example.org/main"}]}}', null, null),
                    ('00000000-0000-0000-0000-000000000005', '{"affiliation":{"products":["UNKNOWN"]},"qualitySystemLinks":{"documents":[{"type":"HOVEDAVTALE","name":"Unknown","url":"https://example.org/unknown"}]}}', null, null)
                    """);
                try (var insert = connection.prepareStatement("INSERT INTO system_information VALUES (?, 'ONE', 7, ?::jsonb, 'Original', now(), 'Original', now())")) {
                    insert.setObject(1, SystemInformationService.idFor("ONE"));
                    insert.setString(2, "{\"notes\":\"Keep me\",\"documents\":[{\"type\":\"ROS\",\"name\":\"Existing\",\"url\":\"https://example.org/existing\"}]}");
                    insert.executeUpdate();
                }
                try (var migration = getClass().getResourceAsStream("/db/migration/V1.43__system_suppliers_and_documents.sql")) {
                    sql.execute(new String(migration.readAllBytes(), StandardCharsets.UTF_8));
                }
                var mapper = new ObjectMapper();
                try (var rows = sql.executeQuery("SELECT * FROM system_information ORDER BY system_code")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getString("system_code")).isEqualTo("ONE");
                    assertThat(rows.getLong("version")).isEqualTo(8);
                    var data = mapper.readTree(rows.getString("data"));
                    assertThat(data.path("notes").asText()).isEqualTo("Keep me");
                    assertThat(data.path("documents").size()).isEqualTo(3);
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getObject("id", UUID.class)).isEqualTo(SystemInformationService.idFor("TWO"));
                    var created = mapper.readTree(rows.getString("data"));
                    assertThat(created.path("documents").size()).isEqualTo(1);
                    assertThat(created.path("administrators").isArray()).isTrue();
                    assertThat(rows.next()).isFalse();
                }
                try (var rows = sql.executeQuery("SELECT data FROM process ORDER BY process_id")) {
                    rows.next();
                    var remaining = mapper.readTree(rows.getString(1)).path("qualitySystemLinks").path("documents");
                    assertThat(remaining.size()).isEqualTo(2);
                    assertThat(remaining.get(0).path("type").asText()).isEqualTo("ANNEN_AVTALE");
                    assertThat(remaining.get(1).path("type").asText()).isEqualTo("ROS");
                    rows.next();
                    assertThat(mapper.readTree(rows.getString(1)).path("qualitySystemLinks").path("documents").size()).isEqualTo(1);
                    rows.next();
                    assertThat(mapper.readTree(rows.getString(1)).path("qualitySystemLinks").has("mainAgreement")).isFalse();
                    rows.next();
                    assertThat(mapper.readTree(rows.getString(1)).path("qualitySystemLinks").path("documents").isEmpty()).isTrue();
                    rows.next();
                    assertThat(mapper.readTree(rows.getString(1)).path("qualitySystemLinks").path("documents").size()).isEqualTo(1);
                }
            } finally {
                connection.rollback();
            }
        }
    }
}
