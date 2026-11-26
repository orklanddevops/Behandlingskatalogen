package no.nav.data.polly.systeminformation;

import no.nav.data.common.exceptions.NotFoundException;
import no.nav.data.common.exceptions.ValidationException;
import no.nav.data.common.utils.MdcUtils;
import no.nav.data.polly.codelist.CodelistRepository;
import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.teams.ResourceService;
import no.nav.data.polly.teams.dto.Resource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SystemInformationServiceTest {
    private final SystemInformationRepository repository = mock(SystemInformationRepository.class);
    private final CodelistRepository codelists = mock(CodelistRepository.class);
    private final ResourceService employees = mock(ResourceService.class);
    private final no.nav.data.polly.processor.domain.repo.ProcessorRepository processors = mock(no.nav.data.polly.processor.domain.repo.ProcessorRepository.class);
    private final SystemInformationService service = new SystemInformationService(repository, codelists, employees, processors);

    @BeforeEach
    void setup() {
        when(codelists.findByListAndCode(ListName.SYSTEM, "SIGNINAPP")).thenReturn(Optional.of(new Codelist()));
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any())).thenAnswer(call -> {
            SystemInformation entity = call.getArgument(0);
            entity.setVersion(entity.getVersion() == null ? 0L : entity.getVersion() + 1);
            return entity;
        });
    }

    private SystemInformationRequest request(Long version, String owner, List<String> admins,
                                             List<String> superUsers, String unit, String url, boolean verified) {
        return new SystemInformationRequest(version, owner, admins, superUsers,
                unit == null ? "" : unit, "support@example.org", url, " Notes ", verified,
                "+47 12345678", "emergency@example.org", "https://emergency.example.org", "+47 87654321");
    }

    @Test
    void knownSystemStartsWithAnEmptyRecordWithoutWriting() {
        var result = service.get("SIGNINAPP");
        assertThat(result.version()).isNull();
        assertThat(result.data().administrators()).isEmpty();
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void unknownSystemCannotBeReadOrCreated() {
        assertThatThrownBy(() -> service.get("UNKNOWN")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.save("UNKNOWN", request(null, null, List.of(), List.of(), null, "", false)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void resolvesNewSelectionsFromDirectoryAndDeduplicatesWithinEachRole() {
        when(employees.getResource("person")).thenReturn(Optional.of(Resource.builder()
                .navIdent("person").fullName("Ada Hansen").email("ada@example.org").build()));
        when(codelists.findByListAndCode(ListName.DEPARTMENT, "IT")).thenReturn(Optional.of(new Codelist()));
        var result = service.save("SIGNINAPP", request(null, "person", List.of("person", "person"),
                List.of("person"), "IT", "https://support.example.org", false));
        assertThat(result.version()).isZero();
        assertThat(result.data().systemOwner().name()).isEqualTo("Ada Hansen");
        assertThat(result.data().administrators()).hasSize(1);
        assertThat(result.data().superUsers()).hasSize(1);
        assertThat(result.data().responsibleTeam()).isNull();
        assertThat(result.data().supportPhone()).isEqualTo("+47 12345678");
        assertThat(result.data().emergencyEmail()).isEqualTo("emergency@example.org");
        assertThat(result.data().emergencyUrl()).isEqualTo("https://emergency.example.org");
        assertThat(result.data().emergencyPhone()).isEqualTo("+47 87654321");
        assertThat(result.data().organisationalUnit()).isEqualTo("IT");
        assertThat(result.data().lastVerifiedDate()).isNull();
        verify(employees, times(1)).getResource("person");
    }

    @Test
    void invalidNewEmployeesAndUnitsCannotBeSaved() {
        assertThatThrownBy(() -> service.save("SIGNINAPP", request(null, "missing", List.of(), List.of(), null, "", false)))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.save("SIGNINAPP", request(null, null, List.of(), List.of(), "missing", "", false)))
                .isInstanceOf(ValidationException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void retainedContactsRemainEditableDuringDirectoryOutagesAndVerificationIsPreserved() {
        var person = new SystemInformationData.Contact("person", "Ada Hansen", "ada@example.org");
        var entity = new SystemInformation();
        entity.setId(SystemInformationService.idFor("SIGNINAPP"));
        entity.setSystemCode("SIGNINAPP");
        entity.setVersion(3L);
        entity.setData(new SystemInformationData(person, List.of(), List.of(),
                new SystemInformationData.TeamReference("team", "IT"), "", "", "", "", LocalDate.of(2026, 1, 1), "Reviewer"));
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        var saved = service.save("SIGNINAPP", request(3L, "person", List.of(), List.of(), null, "", false));
        assertThat(saved.data().systemOwner()).isEqualTo(person);
        assertThat(saved.data().lastVerifiedDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        verifyNoInteractions(employees);
    }

    @Test
    void clearingResponsibilitiesRemovesTheSavedAssignments() {
        var entity = new SystemInformation();
        entity.setId(SystemInformationService.idFor("SIGNINAPP"));
        entity.setSystemCode("SIGNINAPP");
        entity.setVersion(1L);
        entity.setData(new SystemInformationData(new SystemInformationData.Contact("old", "Old", ""),
                List.of(), List.of(), null, "", "", "", "", null, null));
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        var result = service.save("SIGNINAPP", request(1L, null, List.of(), List.of(), null, "", false));
        assertThat(result.data().systemOwner()).isNull();
    }

    @Test
    void staleOrMissingVersionsCannotOverwriteSavedInformation() {
        var entity = new SystemInformation();
        entity.setVersion(4L);
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        for (Long version : new Long[]{null, 3L}) {
            assertThatThrownBy(() -> service.save("SIGNINAPP", request(version, null, List.of(), List.of(), null, "", false)))
                    .isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
        }
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void explicitVerificationRecordsTheReviewerAndDate() {
        MdcUtils.setUser("Ada Hansen");
        try {
            var result = service.save("SIGNINAPP", request(null, null, null, null, null, "", true));
            assertThat(result.data().lastVerifiedDate()).isEqualTo(LocalDate.now(java.time.ZoneId.of("Europe/Oslo")));
            assertThat(result.data().lastVerifiedBy()).isEqualTo("Ada Hansen");
        } finally { MdcUtils.clearUser(); }
    }

    @Test
    void unsafeEmergencyLinksAreRejected() {
        var request = new SystemInformationRequest(null, null, List.of(), List.of(), "", "", "", "", false,
                "", "", "javascript:alert(1)", "");
        assertThatThrownBy(() -> service.save("SIGNINAPP", request)).isInstanceOf(ValidationException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void unsafeAndMalformedSupportLinksAreRejected() {
        for (String url : List.of("javascript:alert(1)", "https://user:password@example.org", "not a url", "//example.org")) {
            assertThatThrownBy(() -> service.save("SIGNINAPP", request(null, null, List.of(), List.of(), null, url, false)))
                    .isInstanceOf(ValidationException.class);
        }
        verify(repository, never()).saveAndFlush(any());
    }
    private SystemInformationRequest extended(Long version, String it, SystemInformationRequest.TechnicalRequest technical,
            SystemInformationData.Economy economy, SystemInformationData.Accessibility accessibility) {
        var base = request(version, null, List.of(), List.of(), "", "", false);
        return new SystemInformationRequest(base.version(), base.systemOwnerId(), base.administratorIds(),
                base.superUserIds(), base.organisationalUnit(), base.supportEmail(), base.supportUrl(),
                base.notes(), false, base.supportPhone(), base.emergencyEmail(), base.emergencyUrl(),
                base.emergencyPhone(), it, technical, economy, accessibility);
    }

    @Test
    void newTabsRoundTripAndRetainResolvedPeopleAndChecklistAnswersDuringDirectoryOutages() {
        when(employees.getResource("person")).thenReturn(Optional.of(Resource.builder()
                .navIdent("person").fullName("Ada Hansen").email("ada@example.org").build()));
        var economy = new SystemInformationData.Economy(java.math.BigDecimal.ZERO, new java.math.BigDecimal("12345.67"),
                "https://example.org/agreement", LocalDate.of(2026, 11, 17), "Tre måneders oppsigelse");
        var accessibility = new SystemInformationData.Accessibility("RELEVANT", "web",
                java.util.Map.of("1.1.1", "YES", "4.1.3", "NO"), java.util.Map.of("1.1.1", "NO_CONTENT"));
        var result = service.save("SIGNINAPP", extended(null, "person",
                new SystemInformationRequest.TechnicalRequest("person", 0, "HIGH"), economy, accessibility));
        assertThat(result.data().itResponsible().name()).isEqualTo("Ada Hansen");
        assertThat(result.data().technical().technicalOperator()).isEqualTo(result.data().itResponsible());
        assertThat(result.data().technical().userCount()).isZero();
        assertThat(result.data().economy()).isEqualTo(economy);
        assertThat(result.data().accessibility()).isEqualTo(accessibility);
        var entity = new SystemInformation();
        entity.setId(SystemInformationService.idFor("SIGNINAPP"));
        entity.setSystemCode("SIGNINAPP");
        entity.setVersion(result.version());
        entity.setData(result.data());
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        clearInvocations(employees);
        var skipped = new SystemInformationData.Accessibility("NOT_RELEVANT", "app", accessibility.webAnswers(), accessibility.appAnswers());
        var saved = service.save("SIGNINAPP", extended(result.version(), "person",
                new SystemInformationRequest.TechnicalRequest("person", 0, "HIGH"), economy, skipped));
        assertThat(saved.data().accessibility().webAnswers()).containsEntry("4.1.3", "NO");
        assertThat(saved.data().accessibility().appAnswers()).containsEntry("1.1.1", "NO_CONTENT");
        assertThat(saved.data().withOrganisationalUnit("NEW").economy()).isEqualTo(economy);
        assertThat(saved.data().withOrganisationalUnit("NEW").itResponsible()).isEqualTo(saved.data().itResponsible());
        verifyNoInteractions(employees);
    }

    @Test
    void invalidAgreementLinksAndChecklistAnswersCannotBeSaved() {
        var badEconomy = new SystemInformationData.Economy(null, null, "javascript:alert(1)", null, "");
        assertThatThrownBy(() -> service.save("SIGNINAPP", extended(null, null, null, badEconomy, null)))
                .isInstanceOf(ValidationException.class);
        for (var invalid : List.of(
                new SystemInformationData.Accessibility("RELEVANT", "UNSET", java.util.Map.of(), java.util.Map.of()),
                new SystemInformationData.Accessibility("RELEVANT", "app", java.util.Map.of(), java.util.Map.of("2.4.1", "YES")),
                new SystemInformationData.Accessibility("RELEVANT", "web", java.util.Map.of("1.1.1", "invalid"), java.util.Map.of()))) {
            assertThatThrownBy(() -> service.save("SIGNINAPP", extended(null, null, null, null, invalid)))
                    .isInstanceOf(ValidationException.class);
        }
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void nestedRequestValidationRejectsNegativeAmountsCountsAndUnknownCriticality() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var invalid = extended(null, null, new SystemInformationRequest.TechnicalRequest(null, -1, "UNKNOWN"),
                    new SystemInformationData.Economy(new java.math.BigDecimal("-1"), new java.math.BigDecimal("1.234"), "", null, ""), null);
            assertThat(factory.getValidator().validate(invalid)).hasSize(4);
        }
    }

    @Test
    void oldJsonRecordsRemainReadableWithEmptyNewSections() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
        var old = mapper.readValue("{\"systemOwner\":null,\"administrators\":[],\"superUsers\":[],\"notes\":\"Existing\"}", SystemInformationData.class);
        assertThat(old.notes()).isEqualTo("Existing");
        assertThat(old.itResponsible()).isNull();
        assertThat(old.economy()).isNull();
        assertThat(old.accessibility()).isNull();
    }

    private SystemInformationRequest documentsRequest(List<java.util.UUID> suppliers, List<SystemInformationData.SystemDocument> documents) {
        return new SystemInformationRequest(null, null, List.of(), List.of(), "", "", "", "", false,
                "", "", "", "", null, null, null, null, suppliers, documents);
    }

    @Test
    void multipleSuppliersAndDocumentsRoundTripAndSurviveOrganisationChanges() {
        var first = java.util.UUID.randomUUID();
        var second = java.util.UUID.randomUUID();
        when(processors.existsById(any())).thenReturn(true);
        var documents = List.of(new SystemInformationData.SystemDocument("HOVEDAVTALE", " Main ", " https://example.org/main "),
                new SystemInformationData.SystemDocument("ANNEN_AVTALE", "Other", "https://example.org/other"),
                new SystemInformationData.SystemDocument("ROS", "Risk", "https://example.org/risk"));
        var saved = service.save("SIGNINAPP", documentsRequest(List.of(first, second, first), documents));
        assertThat(saved.data().supplierIds()).containsExactly(first, second);
        assertThat(saved.data().documents()).hasSize(3);
        assertThat(saved.data().documents().getFirst().name()).isEqualTo("Main");
        assertThat(saved.data().documents().getFirst().url()).isEqualTo("https://example.org/main");
        assertThat(saved.data().withOrganisationalUnit("NEW").documents()).isEqualTo(saved.data().documents());
        assertThat(saved.data().withOrganisationalUnit("NEW").supplierIds()).containsExactly(first, second);
    }

    @Test
    void rejectsUnknownSuppliersUnsafeDocumentsAndUnsupportedDocumentTypes() {
        assertThatThrownBy(() -> service.save("SIGNINAPP", documentsRequest(List.of(java.util.UUID.randomUUID()), List.of())))
                .isInstanceOf(ValidationException.class);
        for (var document : List.of(new SystemInformationData.SystemDocument("DPIA", "DPIA", "https://example.org"),
                new SystemInformationData.SystemDocument("ROS", "Risk", "javascript:alert(1)"),
                new SystemInformationData.SystemDocument("ROS", " ", "https://example.org"))) {
            assertThatThrownBy(() -> service.save("SIGNINAPP", documentsRequest(List.of(), List.of(document))))
                    .isInstanceOf(ValidationException.class);
        }
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void omittedNewFieldsArePreservedWhileExplicitEmptyListsClearThem() {
        var supplier = java.util.UUID.randomUUID();
        when(processors.existsById(supplier)).thenReturn(true);
        var saved = service.save("SIGNINAPP", documentsRequest(List.of(supplier),
                List.of(new SystemInformationData.SystemDocument("ROS", "Risk", "https://example.org"))));
        var entity = new SystemInformation();
        entity.setSystemCode("SIGNINAPP");
        entity.setVersion(null);
        entity.setData(saved.data());
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        var retained = service.save("SIGNINAPP", documentsRequest(null, null));
        assertThat(retained.data().supplierIds()).containsExactly(supplier);
        assertThat(retained.data().documents()).hasSize(1);
        entity.setVersion(null);
        var cleared = service.save("SIGNINAPP", documentsRequest(List.of(), List.of()));
        assertThat(cleared.data().supplierIds()).isEmpty();
        assertThat(cleared.data().documents()).isEmpty();
    }

}
