package no.nav.data.polly.codelist;

import no.nav.data.integration.eadm.*;
import no.nav.data.polly.codelist.domain.*;
import no.nav.data.polly.process.domain.sub.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class OrganisationHierarchyTest {
    private List<Codelist> codes() {
        var chart = new OrganisationChart();
        chart.setUnits(List.of(
            new OrganisationUnit("182", null, "Kommunedirektørens stab", "", "Rammeområde"),
            new OrganisationUnit("186", "182", "Organisasjon og innbyggerkontakt", "", "Enheter"),
            new OrganisationUnit("200", "186", "HR", "", "Avdelinger"),
            new OrganisationUnit("201", "200", "HR child", "", "Avdelinger"),
            new OrganisationUnit("173", null, "Oppvekst", "", "Rammeområde"),
            new OrganisationUnit("238", "173", "Krokstadøra barnehage", "", "Enheter"),
            new OrganisationUnit("282", "173", "Aa skole", "", "Enheter"),
            new OrganisationUnit("183", null, "Politisk styring", "", "Enheter"),
            new OrganisationUnit("X", "200", "Excluded", "", "Personer uten arbeidsforhold"),
            new OrganisationUnit("Y", "X", "Excluded child", "", "Enheter")));
        return OrganisationCodelists.fromChart(chart);
    }

    @Test
    void rootsAreEnheterSchoolsAreAvdelingerAndHrAndDeeperLevelsAreUnderavdelinger() {
        var codes = codes();
        assertThat(codes).filteredOn(c -> c.getList() == ListName.DEPARTMENT)
            .extracting(Codelist::getCode).containsExactly("182", "173", "183");
        assertThat(codes).filteredOn(c -> c.getList() == ListName.SEKSJON)
            .extracting(Codelist::getCode).containsExactly("186", "238", "282");
        assertThat(codes).filteredOn(c -> c.getList() == ListName.SUB_DEPARTMENT)
            .extracting(Codelist::getCode).containsExactly("200", "201");
        assertThat(codes).filteredOn(c -> c.getCode().equals("238"))
            .extracting(Codelist::getParentCode).containsExactly("173");
    }

    @Test
    void movesAnExistingSchoolAssignmentToAvdelingAndFillsTheRootWithoutChangingTeams() {
        var affiliation = Affiliation.builder().nomDepartmentId("238").nomDepartmentName("Krokstadøra barnehage")
            .productTeams(List.of("TEAM")).build();
        OrganisationAffiliations.reclassify(affiliation, "238", codes());
        assertThat(affiliation.getNomDepartmentId()).isEqualTo("173");
        assertThat(affiliation.getNomDepartmentName()).isEqualTo("Oppvekst");
        assertThat(affiliation.getSeksjoner()).extracting(nomSeksjon::getNomSeksjonId).containsExactly("238");
        assertThat(affiliation.getProductTeams()).containsExactly("TEAM");
        OrganisationAffiliations.reclassify(affiliation, "238", codes());
        assertThat(affiliation.getSeksjoner()).hasSize(1);
    }

    @Test
    void movesHrToUnderavdelingAndPreservesItsFullParentChainInEitherMigrationOrder() {
        for (boolean parentFirst : List.of(true, false)) {
            var affiliation = Affiliation.builder().nomDepartmentId("186")
                .seksjoner(List.of(new nomSeksjon("200", "HR")))
                .subDepartments(List.of("201")).build();
            for (String id : parentFirst ? List.of("186", "200") : List.of("200", "186"))
                OrganisationAffiliations.reclassify(affiliation, id, codes());
            assertThat(affiliation.getNomDepartmentId()).isEqualTo("182");
            assertThat(affiliation.getSeksjoner()).extracting(nomSeksjon::getNomSeksjonId).containsExactly("186");
            assertThat(affiliation.getSubDepartments()).containsExactlyInAnyOrder("200", "201");
        }
    }

    @Test
    void reclassifiesTreatmentProcessorAndSystemReferencesThroughTheUsageService() {
        var processes = org.mockito.Mockito.mock(no.nav.data.polly.process.domain.repo.ProcessRepository.class);
        var processors = org.mockito.Mockito.mock(no.nav.data.polly.process.dpprocess.domain.repo.DpProcessRepository.class);
        var systems = org.mockito.Mockito.mock(no.nav.data.polly.systeminformation.SystemInformationRepository.class);
        var process = org.mockito.Mockito.spy(new no.nav.data.polly.process.domain.Process());
        process.setId(UUID.randomUUID());
        process.getData().setAffiliation(Affiliation.builder().nomDepartmentId("238").build());
        org.mockito.Mockito.doReturn(no.nav.data.polly.process.dto.ProcessShortResponse.builder().id(process.getId()).build())
            .when(process).convertToShortResponse();
        var dp = new no.nav.data.polly.process.dpprocess.domain.DpProcess();
        dp.setId(UUID.randomUUID());
        dp.getData().setAffiliation(Affiliation.builder().nomDepartmentId("238").build());
        org.mockito.Mockito.when(processes.findByDepartment("238")).thenReturn(List.of(process));
        org.mockito.Mockito.when(processors.findByDepartment("238")).thenReturn(List.of(dp));
        org.mockito.Mockito.when(processes.findAllById(List.of(process.getId()))).thenReturn(List.of(process));
        org.mockito.Mockito.when(processors.findAllById(List.of(dp.getId()))).thenReturn(List.of(dp));
        var system = new no.nav.data.polly.systeminformation.SystemInformation();
        system.setSystemCode("SYS");
        system.setData(no.nav.data.polly.systeminformation.SystemInformationData.empty().withOrganisationalUnit("238"));
        org.mockito.Mockito.when(systems.findByOrganisationalUnit("238")).thenReturn(List.of(system));
        var usage = new no.nav.data.polly.codelist.codeusage.CodeUsageService(processes, processors,
            org.mockito.Mockito.mock(no.nav.data.polly.policy.domain.PolicyRepository.class),
            org.mockito.Mockito.mock(no.nav.data.polly.informationtype.InformationTypeRepository.class),
            org.mockito.Mockito.mock(no.nav.data.polly.disclosure.domain.DisclosureRepository.class),
            org.mockito.Mockito.mock(no.nav.data.polly.document.domain.DocumentRepository.class),
            org.mockito.Mockito.mock(no.nav.data.polly.processor.domain.repo.ProcessorRepository.class),
            org.mockito.Mockito.mock(no.nav.data.polly.codelist.dto.CodelistRequestValidator.class), systems);
        usage.reclassifyOrganisationUsage(ListName.DEPARTMENT, "238", codes());
        for (var affiliation : List.of(process.getData().getAffiliation(), dp.getData().getAffiliation())) {
            assertThat(affiliation.getNomDepartmentId()).isEqualTo("173");
            assertThat(affiliation.getSeksjoner()).extracting(nomSeksjon::getNomSeksjonId).containsExactly("238");
        }
        assertThat(system.getData().organisationalUnit()).isEqualTo("173");
    }
    @Test
    void rejectsMissingParentsAndCyclesBeforeReplacingAnyCodes() {
        var chart = new OrganisationChart();
        chart.setUnits(List.of(new OrganisationUnit("1", "missing", "Missing parent", "", "Enheter")));
        assertThatThrownBy(() -> OrganisationCodelists.fromChart(chart)).isInstanceOf(IllegalArgumentException.class);
        chart.setUnits(List.of(new OrganisationUnit("1", "2", "One", "", "Enheter"),
            new OrganisationUnit("2", "1", "Two", "", "Enheter")));
        assertThatThrownBy(() -> OrganisationCodelists.fromChart(chart)).isInstanceOf(IllegalArgumentException.class);
    }
}
