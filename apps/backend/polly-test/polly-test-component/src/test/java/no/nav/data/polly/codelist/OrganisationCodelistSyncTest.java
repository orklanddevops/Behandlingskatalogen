package no.nav.data.polly.codelist;

import no.nav.data.integration.eadm.*;
import no.nav.data.polly.codelist.codeusage.CodeUsageService;
import no.nav.data.polly.codelist.domain.*;
import no.nav.data.polly.codelist.dto.*;
import no.nav.data.common.security.*;
import no.nav.data.integration.nom.*;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganisationCodelistSyncTest {
    private OrganisationChart chart() {
        var chart = new OrganisationChart();
        chart.setUnits(List.of(
            new OrganisationUnit("0", null, "Ramme", "Private Manager", "Rammeområde"),
            new OrganisationUnit("10", "0", "Enhet A", "", "Enheter"),
            new OrganisationUnit("11", "10", "Avdeling A", "", "Avdelinger"),
            new OrganisationUnit("12", "11", "Underavdeling A", "", "Avdelinger"),
            new OrganisationUnit("20", null, "Enhet B", "", "Enheter"),
            new OrganisationUnit("21", "20", "Avdeling B", "", "Avdelinger"),
            new OrganisationUnit("22", "21", "Ikke arbeidsforhold", "", "Personer uten arbeidsforhold")));
        return chart;
    }

    private Codelist code(ListName list, String id, String name) {
        return Codelist.builder().list(list).code(id).shortName(name).description("Old").build();
    }

    @Test
    void reclassifiesExistingStableIdsBeforeRemovingTheirPreviousCategory() {
        var repository = mock(CodelistRepository.class);
        var usage = mock(CodeUsageService.class);
        var previousUnit = code(ListName.DEPARTMENT, "10", "Enhet A");
        var previousSection = code(ListName.SEKSJON, "11", "Avdeling A");
        when(repository.findAll()).thenReturn(List.of(previousUnit, previousSection));
        new OrganisationCodelistSync(repository, usage).replace(chart());
        var order = inOrder(usage, repository);
        order.verify(usage).reclassifyOrganisationUsage(eq(ListName.DEPARTMENT), eq("10"), anyList());
        order.verify(usage).reclassifyOrganisationUsage(eq(ListName.SEKSJON), eq("11"), anyList());
        order.verify(repository).deleteAll(List.of(previousUnit, previousSection));
    }
    @AfterEach void clear() { CodelistCache.init(); }

    @Test
    void mapsChartDepthRatherThanSourceTypesAndKeepsPublicCodesFreeOfManagerNames() {
        var codes = OrganisationCodelists.fromChart(chart());
        assertThat(codes).filteredOn(c -> c.getList() == ListName.DEPARTMENT).extracting(Codelist::getCode).containsExactly("0", "20");
        assertThat(codes).filteredOn(c -> c.getList() == ListName.SEKSJON).extracting(Codelist::getCode).containsExactly("10", "21");
        assertThat(codes).filteredOn(c -> c.getList() == ListName.SUB_DEPARTMENT).extracting(Codelist::getCode).containsExactly("11", "12");
        assertThat(codes).allSatisfy(c -> {
            assertThat(c.getSource()).isEqualTo("EADM");
            assertThat(c.getDescription()).doesNotContain("Private Manager");
        });
        var child = codes.stream().filter(c -> c.getCode().equals("11")).findFirst().orElseThrow();
        assertThat(CodelistResponse.buildFrom(child).getParentCode()).isEqualTo("10");
    }

    @Test
    void replacesAllObsoleteOrganisationCodesMigratesUniqueNamesAndLeavesTeamsAlone() {
        var repository = mock(CodelistRepository.class);
        var usage = mock(CodeUsageService.class);
        var oldUnit = code(ListName.DEPARTMENT, "OLD", " enhet b ");
        var oldSection = code(ListName.SEKSJON, "OLD_SECTION", "Enhet A");
        var unknown = code(ListName.SUB_DEPARTMENT, "UNKNOWN", "Old unknown");
        var team = code(ListName.TEAM, "TEAM", "Team");
        when(repository.findAll()).thenReturn(List.of(oldUnit, oldSection, unknown, team));
        new OrganisationCodelistSync(repository, usage).replace(chart());
        verify(usage).replaceUsage(ListName.DEPARTMENT, "OLD", "20", "Enhet B");
        verify(usage).replaceUsage(ListName.SEKSJON, "OLD_SECTION", "10", "Enhet A");
        verify(usage, never()).replaceUsage(eq(ListName.SUB_DEPARTMENT), any(), any(), any());
        verify(repository).deleteAll(List.of(oldUnit, oldSection, unknown));
        verify(repository).saveAll(argThat((List<Codelist> saved) -> saved.size() == 6
                && saved.stream().noneMatch(c -> c.getList() == ListName.TEAM)));
    }

    @Test
    void invalidUntypedChartCannotDeleteExistingCodesAndAmbiguousNamesAreNotGuessed() {
        var repository = mock(CodelistRepository.class);
        var usage = mock(CodeUsageService.class);
        var chart = new OrganisationChart();
        chart.setUnits(List.of(new OrganisationUnit("1", null, "No type", "")));
        var sync = new OrganisationCodelistSync(repository, usage);
        assertThatThrownBy(() -> sync.replace(chart)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository, usage);
        chart.setUnits(List.of(new OrganisationUnit("1", null, "Same", "", "Enheter"),
                new OrganisationUnit("2", null, "Same", "", "Enheter")));
        var old = code(ListName.DEPARTMENT, "OLD", "Same");
        when(repository.findAll()).thenReturn(List.of(old));
        sync.replace(chart);
        verifyNoInteractions(usage);
        verify(repository).deleteAll(List.of(old));
    }

    @Test
    void importedSectionsAreScopedToTheirUnitAndSurviveNormalCacheRefresh() {
        var repository = mock(CodelistRepository.class);
        var store = mock(OrganisationChartStore.class);
        when(store.get()).thenReturn(chart());
        when(repository.findAll()).thenReturn(OrganisationCodelists.fromChart(chart()));
        var service = new CodelistService(repository, store, mock(CodelistRequestValidator.class));
        service.refreshCache();
        var properties = new NomGraphQlProperties();
        properties.setEnabled(false);
        var nom = new NomGraphClient(new SecurityProperties(), mock(TokenProvider.class), properties);
        assertThat(nom.getAllSeksjonForAvdeling("0")).extracting(no.nav.data.integration.nom.domain.OrgEnhet::getId).containsExactly("10");
        assertThat(nom.getAllSeksjonForAvdeling("20")).extracting(no.nav.data.integration.nom.domain.OrgEnhet::getId).containsExactly("21");
        properties.setEnabled(true);
        assertThat(nom.getAllAvdelinger()).hasSize(2);
        assertThat(nom.getAllSeksjonForAvdeling("0")).extracting(no.nav.data.integration.nom.domain.OrgEnhet::getId).containsExactly("10");
        service.refreshCache();
        assertThat(CodelistStaticService.getCodelistResponse(ListName.SUB_DEPARTMENT, "12").getParentCode()).isEqualTo("11");
    }

    @Test
    void directWritesAndMixedBatchesCannotBypassProtectionWhileTeamsRemainWritable() {
        var repository = mock(CodelistRepository.class);
        var service = new CodelistService(repository, mock(OrganisationChartStore.class), mock(CodelistRequestValidator.class));
        for (var list : List.of(ListName.DEPARTMENT, ListName.SEKSJON, ListName.SUB_DEPARTMENT)) {
            assertThatThrownBy(() -> service.save(List.of(code(ListName.TEAM, "T", "Team"), code(list, "NEW", "New"))))
                    .isInstanceOf(ResponseStatusException.class);
            assertThatThrownBy(() -> service.update(List.of(CodelistRequest.builder().list(list.name()).code("NEW").build())))
                    .isInstanceOf(ResponseStatusException.class);
            assertThatThrownBy(() -> service.delete(list, "NEW")).isInstanceOf(ResponseStatusException.class);
        }
        verifyNoInteractions(repository);
        var team = code(ListName.TEAM, "T", "Team");
        when(repository.saveAll(List.of(team))).thenReturn(List.of(team));
        service.save(List.of(team));
        verify(repository).saveAll(List.of(team));
        when(repository.findByListAndCode(ListName.TEAM, "T")).thenReturn(Optional.of(team));
        service.delete(ListName.TEAM, "T");
        verify(repository).delete(team);
    }
}
