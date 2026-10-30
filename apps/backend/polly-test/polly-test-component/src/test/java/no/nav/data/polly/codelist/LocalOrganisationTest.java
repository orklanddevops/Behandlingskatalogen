package no.nav.data.polly.codelist;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import no.nav.data.polly.codelist.codeusage.CodeUsageService;
import no.nav.data.polly.codelist.dto.CodelistRequestValidator;
import no.nav.data.polly.disclosure.domain.DisclosureRepository;
import no.nav.data.polly.document.domain.DocumentRepository;
import no.nav.data.polly.informationtype.InformationTypeRepository;
import no.nav.data.polly.policy.domain.PolicyRepository;
import no.nav.data.polly.process.domain.Process;
import no.nav.data.polly.process.domain.repo.ProcessRepository;
import no.nav.data.polly.process.domain.sub.Affiliation;
import no.nav.data.polly.process.domain.sub.nomSeksjon;
import no.nav.data.polly.process.dpprocess.domain.DpProcess;
import no.nav.data.polly.process.dpprocess.domain.repo.DpProcessRepository;
import no.nav.data.polly.process.dto.ProcessShortResponse;
import no.nav.data.polly.processor.domain.repo.ProcessorRepository;
import no.nav.data.common.security.SecurityProperties;
import no.nav.data.common.security.TokenProvider;
import no.nav.data.integration.nom.NomGraphClient;
import no.nav.data.integration.nom.NomGraphQlProperties;
import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.teams.TeamStub;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class LocalOrganisationTest {
    @AfterEach
    void clearCodes() {
        CodelistCache.init();
    }

    @Test
    void disabledNomReadsDepartmentCodesAndReflectsAdminChangesImmediately() {
        CodelistCache.init();
        var properties = new NomGraphQlProperties();
        properties.setEnabled(false);
        var tokens = mock(TokenProvider.class);
        var client = new NomGraphClient(new SecurityProperties(), tokens, properties);
        assertThat(client.getAllAvdelinger()).isEmpty();

        CodelistCache.set(Codelist.builder().list(ListName.DEPARTMENT).code("HELSE")
                .shortName("Helse").description("Helseavdelingen").build());
        assertThat(client.getAllAvdelinger()).singleElement()
                .satisfies(department -> {
                    assertThat(department.getId()).isEqualTo("HELSE");
                    assertThat(department.getNavn()).isEqualTo("Helse");
                });
        assertThat(client.getAvdelingById("HELSE")).isPresent();
        assertThat(client.getById("HELSE").getNavn()).isEqualTo("Helse");
        assertThat(client.getAllSeksjonForAvdeling("HELSE")).isEmpty();
        verifyNoInteractions(tokens);
    }

    @Test
    void localSectionsAreSharedAndReflectCodeChangesImmediately() {
        CodelistCache.init();
        var properties = new NomGraphQlProperties();
        properties.setEnabled(false);
        var tokens = mock(TokenProvider.class);
        var client = new NomGraphClient(new SecurityProperties(), tokens, properties);
        assertThat(client.getAllSeksjonForAvdeling("ENHET_A")).isEmpty();
        CodelistCache.set(Codelist.builder().list(ListName.SEKSJON).code("IT")
                .shortName("IT").description("IT-avdelingen").build());
        assertThat(client.getAllSeksjonForAvdeling("ENHET_A")).singleElement()
                .satisfies(section -> {
                    assertThat(section.getId()).isEqualTo("IT");
                    assertThat(section.getNavn()).isEqualTo("IT");
                });
        assertThat(client.getAllSeksjonForAvdeling("ENHET_B"))
                .isEqualTo(client.getAllSeksjonForAvdeling("ENHET_A"));
        assertThat(client.getById("IT").getNavn()).isEqualTo("IT");
        CodelistCache.set(Codelist.builder().list(ListName.SEKSJON).code("IT")
                .shortName("Informasjonsteknologi").description("IT-avdelingen").build());
        assertThat(client.getAllSeksjonForAvdeling("ENHET_A")).singleElement()
                .satisfies(section -> assertThat(section.getNavn()).isEqualTo("Informasjonsteknologi"));
        CodelistCache.remove(ListName.SEKSJON, "IT");
        assertThat(client.getAllSeksjonForAvdeling("ENHET_A")).isEmpty();
        verifyNoInteractions(tokens);
    }

    @Test
    void sectionUsageProtectsBothKindsOfActivityAndReplacementKeepsNames() {
        CodelistCache.init();
        CodelistCache.set(Codelist.builder().list(ListName.SEKSJON).code("NEW")
                .shortName("Ny avdeling").description("Ny avdeling").build());
        var processes = mock(ProcessRepository.class);
        var dpProcesses = mock(DpProcessRepository.class);
        var section = new nomSeksjon("OLD", "Gammel avdeling");
        var other = new nomSeksjon("OTHER", "Annen avdeling");
        var process = spy(new Process());
        process.setId(UUID.randomUUID());
        process.getData().setAffiliation(Affiliation.builder()
                .seksjoner(new ArrayList<>(List.of(section, other))).build());
        doReturn(ProcessShortResponse.builder().id(process.getId()).build())
                .when(process).convertToShortResponse();
        var dp = new DpProcess();
        dp.setId(UUID.randomUUID());
        dp.getData().setAffiliation(Affiliation.builder()
                .seksjoner(new ArrayList<>(List.of(
                        new nomSeksjon("OLD", "Gammel avdeling")))).build());
        when(processes.findBySeksjoner(List.of("OLD"))).thenReturn(List.of(process));
        when(dpProcesses.findBySeksjoner(List.of("OLD"))).thenReturn(List.of(dp));
        when(processes.findAllById(List.of(process.getId()))).thenReturn(List.of(process));
        when(dpProcesses.findAllById(List.of(dp.getId()))).thenReturn(List.of(dp));
        var usage = new CodeUsageService(processes, dpProcesses,
                mock(PolicyRepository.class),
                mock(InformationTypeRepository.class),
                mock(DisclosureRepository.class),
                mock(DocumentRepository.class),
                mock(ProcessorRepository.class),
                mock(CodelistRequestValidator.class));
        var before = usage.findCodeUsage(ListName.SEKSJON, "OLD");
        assertThat(before.isInUse()).isTrue();
        assertThat(before.getProcesses()).hasSize(1);
        assertThat(before.getDpProcesses()).hasSize(1);
        usage.replaceUsage(ListName.SEKSJON, "OLD", "NEW", null);
        assertThat(section.getNomSeksjonId()).isEqualTo("NEW");
        assertThat(section.getNomSeksjonName()).isEqualTo("Ny avdeling");
        assertThat(other.getNomSeksjonId()).isEqualTo("OTHER");
        assertThat(dp.getData().getAffiliation().getSeksjoner().getFirst().getNomSeksjonName())
                .isEqualTo("Ny avdeling");
    }

    @Test
    void disabledTeamCatalogueReadsTeamCodesAndReflectsAdminChangesImmediately() {
        CodelistCache.init();
        var teams = new TeamStub();
        assertThat(teams.getAllTeams()).isEmpty();
        CodelistCache.set(Codelist.builder().list(ListName.TEAM).code("OMSORG")
                .shortName("Omsorgsteam").description("Kommunens omsorgsteam").build());
        assertThat(teams.getAllTeams()).singleElement()
                .satisfies(team -> {
                    assertThat(team.getId()).isEqualTo("OMSORG");
                    assertThat(team.getName()).isEqualTo("Omsorgsteam");
                    assertThat(team.getMembers()).isEmpty();
                });
        assertThat(teams.getTeam("OMSORG")).isPresent();
        CodelistCache.remove(ListName.TEAM, "OMSORG");
        assertThat(teams.getTeam("OMSORG")).isEmpty();
    }
}
