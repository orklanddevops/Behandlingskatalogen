package no.nav.data.common.jpa;

import no.nav.data.common.auditing.AuditVersionListener;
import no.nav.data.common.auditing.domain.AuditVersionRepository;
import no.nav.data.polly.codelist.CodelistRepository;
import no.nav.data.polly.codelist.CodelistUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JpaConfigTest {
    @Test
    void initializesAuditRepositoryBeforeBackfillingNewCodelists() throws Exception {
        var previous = (AuditVersionRepository) ReflectionTestUtils.getField(AuditVersionListener.class, "repository");
        AuditVersionListener.setRepo(null);
        try (var context = new AnnotationConfigApplicationContext()) {
            var auditRepository = mock(AuditVersionRepository.class);
            var codelistRepository = mock(CodelistRepository.class);
            var transactions = mock(TransactionTemplate.class);
            when(codelistRepository.findAll()).thenReturn(List.of(CodelistUtils.createCodelist()));
            when(auditRepository.findByTableIdOrderByTimeDesc(any())).thenReturn(List.of());
            when(transactions.execute(any())).thenAnswer(invocation ->
                    ((TransactionCallback<?>) invocation.getArgument(0)).doInTransaction(null));
            context.registerBean(AuditVersionRepository.class, () -> auditRepository);
            context.registerBean(CodelistRepository.class, () -> codelistRepository);
            context.registerBean(TransactionTemplate.class, () -> transactions);
            context.register(AuditStartup.class);
            context.refresh();

            // The backfill can run first: the dependency must be initialized when beans are created.
            context.getBean("auditMissingEntities", ApplicationRunner.class).run(null);
            verify(auditRepository).save(any());
        } finally {
            AuditVersionListener.setRepo(previous);
        }
    }

    @Configuration(proxyBeanMethods = false)
    static class AuditStartup {
        @Bean
        InitializingBean initAudit(AuditVersionRepository repository) {
            return new JpaConfig().initAudit(repository);
        }

        @Bean
        @DependsOn("initAudit")
        ApplicationRunner auditMissingEntities(CodelistRepository codelists,
                AuditVersionRepository audits, TransactionTemplate transactions) {
            return new JpaConfig().auditMissingEntities(codelists, audits, transactions);
        }
    }
}
