package no.nav.data.polly.dashboard;

import no.nav.data.common.security.SecurityProperties;
import no.nav.data.common.security.TokenProvider;
import no.nav.data.integration.nom.NomGraphClient;
import no.nav.data.integration.nom.NomGraphQlProperties;
import no.nav.data.polly.alert.domain.AlertRepository;
import no.nav.data.polly.disclosure.domain.DisclosureRepository;
import no.nav.data.polly.process.domain.repo.ProcessRepository;
import no.nav.data.polly.process.dpprocess.domain.repo.DpProcessRepository;
import no.nav.data.polly.process.dto.ProcessStateRequest.ProcessStatusFilter;
import no.nav.data.polly.teams.TeamStub;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OfflineDashboardTest {
    @Test
    void emptyLocalInstallationCanLoadDashboardAndUnitsWithoutCallingNom() {
        var properties = new NomGraphQlProperties();
        properties.setEnabled(false);
        var tokens = mock(TokenProvider.class);
        var nom = new NomGraphClient(new SecurityProperties(), tokens, properties);
        var processes = mock(ProcessRepository.class);
        var dpProcesses = mock(DpProcessRepository.class);
        var disclosures = mock(DisclosureRepository.class);
        when(processes.findAll(any(Pageable.class))).thenReturn(Page.empty());
        when(dpProcesses.findAll(any(Pageable.class))).thenReturn(Page.empty());
        when(disclosures.findAll(any(Pageable.class))).thenReturn(Page.empty());
        var dashboard = new DashboardController(processes, dpProcesses, disclosures, nom, mock(AlertRepository.class), new TeamStub());
        for (var filter : ProcessStatusFilter.values()) {
            assertThat(dashboard.getDashboardData(filter).getStatusCode().value()).isEqualTo(200);
        }
        assertThat(nom.getAllAvdelinger()).isNotNull();
        verifyNoInteractions(tokens);
    }
}
