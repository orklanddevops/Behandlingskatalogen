package no.nav.data.polly.systeminformation;

import jakarta.persistence.OptimisticLockException;
import no.nav.data.common.auditing.AuditVersionListener;
import no.nav.data.common.auditing.domain.AuditVersionRepository;
import org.hibernate.SessionFactory;
import org.hibernate.StaleObjectStateException;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

// Use an isolated PostgreSQL database, never the application's database.
@EnabledIfEnvironmentVariable(named = "BK_SYSTEM_INFORMATION_TEST_DB", matches = ".+")
class SystemInformationPersistenceTest {
    private static SessionFactory factory;
    private static AuditVersionRepository previousAuditRepository;
    private static AuditVersionRepository auditRepository;

    @BeforeAll
    static void start() throws Exception {
        String url = System.getenv("BK_SYSTEM_INFORMATION_TEST_DB");
        try (var connection = DriverManager.getConnection(url, "bk_test", ""); var statement = connection.createStatement();
             var migration = SystemInformationPersistenceTest.class.getResourceAsStream("/db/migration/V1.39__system_information.sql")) {
            statement.execute(new String(migration.readAllBytes(), StandardCharsets.UTF_8)
                    .replace("CREATE TABLE SYSTEM_INFORMATION", "CREATE TABLE IF NOT EXISTS SYSTEM_INFORMATION"));
        }
        previousAuditRepository = (AuditVersionRepository) ReflectionTestUtils.getField(AuditVersionListener.class, "repository");
        auditRepository = mock(AuditVersionRepository.class);
        AuditVersionListener.setRepo(auditRepository);
        factory = new Configuration().addAnnotatedClass(SystemInformation.class)
                .setProperty("hibernate.connection.url", url)
                .setProperty("hibernate.connection.username", "bk_test")
                .setProperty("hibernate.connection.password", "")
                .setProperty("hibernate.hbm2ddl.auto", "validate").buildSessionFactory();
    }

    @AfterAll
    static void stop() {
        if (factory != null) factory.close();
        AuditVersionListener.setRepo(previousAuditRepository);
    }

    private SystemInformation create(String code) {
        var entity = new SystemInformation();
        entity.setId(UUID.randomUUID());
        entity.setSystemCode(code + UUID.randomUUID());
        entity.setCreatedBy("Test employee");
        entity.setCreatedDate(LocalDateTime.now());
        entity.setData(new SystemInformationData(new SystemInformationData.Contact("person", "Ada Hansen", "ada@example.org"),
                List.of(), List.of(), new SystemInformationData.TeamReference("team", "IT"), "IT", "", "", "Original", null, null));
        try (var session = factory.openSession()) {
            var transaction = session.beginTransaction();
            session.persist(entity);
            transaction.commit();
        }
        return entity;
    }

    @Test
    void migrationAndJsonRecordPersistWithAnAuditEntry() {
        var original = create("PERSISTENCE");
        try (var session = factory.openSession()) {
            var loaded = session.find(SystemInformation.class, original.getId());
            assertThat(loaded.getVersion()).isZero();
            assertThat(loaded.getData().systemOwner().name()).isEqualTo("Ada Hansen");
            assertThat(loaded.getData().responsibleTeam().name()).isEqualTo("IT");
            assertThat(loaded.getData().administrators()).isEmpty();
        }
        verify(auditRepository, atLeastOnce()).save(argThat(audit -> audit.getTable().equals("SYSTEM_INFORMATION")
                && audit.getTableId().equals(original.getId().toString())));
    }

    @Test
    void unitUsageQueryAndReplacementPersistWithoutLosingContactData() {
        var original = create("UNIT_REFERENCE");
        try (var session = factory.openSession()) {
            var repository = new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(session)
                    .getRepository(SystemInformationRepository.class);
            var matches = repository.findByOrganisationalUnit("IT");
            var entity = matches.stream().filter(record -> record.getId().equals(original.getId())).findFirst().orElseThrow();
            var before = entity.getData();
            var transaction = session.beginTransaction();
            entity.setData(before.withOrganisationalUnit("NEW_UNIT"));
            transaction.commit();
        }
        try (var session = factory.openSession()) {
            var repository = new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(session)
                    .getRepository(SystemInformationRepository.class);
            assertThat(repository.findByOrganisationalUnit("NEW_UNIT")).anySatisfy(entity -> {
                assertThat(entity.getId()).isEqualTo(original.getId());
                assertThat(entity.getData()).isEqualTo(original.getData().withOrganisationalUnit("NEW_UNIT"));
            });
            assertThat(repository.findByOrganisationalUnit("IT")).noneMatch(entity -> entity.getId().equals(original.getId()));
        }
    }

    @Test
    void simultaneousUpdatesCannotSilentlyOverwriteEachOther() {
        var original = create("CONCURRENCY");
        try (var first = factory.openSession(); var second = factory.openSession()) {
            var firstTx = first.beginTransaction();
            var secondTx = second.beginTransaction();
            var one = first.find(SystemInformation.class, original.getId());
            var two = second.find(SystemInformation.class, original.getId());
            one.setData(SystemInformationData.empty());
            firstTx.commit();
            two.setData(SystemInformationData.empty());
            assertThatThrownBy(secondTx::commit).isInstanceOfAny(OptimisticLockException.class, StaleObjectStateException.class);
            if (secondTx.isActive()) secondTx.rollback();
        }
    }
}
