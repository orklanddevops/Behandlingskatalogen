package no.nav.data.polly.process;

import java.util.List;
import java.util.UUID;
import no.nav.data.common.mail.EmailService;
import no.nav.data.common.template.TemplateService;
import no.nav.data.polly.alert.AlertService;
import no.nav.data.polly.codelist.codeusage.CodeUsageService;
import no.nav.data.polly.disclosure.domain.DisclosureRepository;
import no.nav.data.polly.policy.domain.PolicyRepository;
import no.nav.data.polly.process.domain.Process;
import no.nav.data.polly.process.domain.ProcessStatus;
import no.nav.data.polly.process.domain.repo.ProcessRepository;
import no.nav.data.polly.teams.ResourceService;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RevisionMailDisabledTest {
    @Test
    void revisionStatusStillChangesButNoDirectoryLookupOrMailIsScheduled() {
        var repository = mock(ProcessRepository.class);
        var resources = mock(ResourceService.class);
        var templates = mock(TemplateService.class);
        var mail = mock(EmailService.class);
        var service = new ProcessService(repository, mock(DisclosureRepository.class), resources, mock(AlertService.class),
                mock(CodeUsageService.class), templates, mail, mock(PolicyRepository.class));
        var process = new Process();
        process.setId(UUID.randomUUID());
        process.setLastModifiedBy("A123456 - NAV employee");
        when(repository.findAllById(List.of(process.getId()))).thenReturn(List.of(process));
        service.requireRevision(List.of(process.getId()), "Kontroller behandlingen", false);
        assertThat(process.getData().getStatus()).isEqualTo(ProcessStatus.NEEDS_REVISION);
        assertThat(process.getData().getRevisionText()).isEqualTo("Kontroller behandlingen");
        verifyNoInteractions(resources, templates, mail);
    }
}
