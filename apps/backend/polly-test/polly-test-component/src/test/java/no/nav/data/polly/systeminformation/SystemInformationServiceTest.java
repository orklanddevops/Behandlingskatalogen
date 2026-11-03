package no.nav.data.polly.systeminformation;

import no.nav.data.common.exceptions.NotFoundException;
import no.nav.data.common.exceptions.ValidationException;
import no.nav.data.common.utils.MdcUtils;
import no.nav.data.polly.codelist.CodelistRepository;
import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.teams.ResourceService;
import no.nav.data.polly.teams.TeamService;
import no.nav.data.polly.teams.domain.Team;
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
    private final TeamService teams = mock(TeamService.class);
    private final SystemInformationService service = new SystemInformationService(repository, codelists, employees, teams);

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
                                             List<String> superUsers, String team, String url, boolean verified) {
        return new SystemInformationRequest(version, owner, admins, superUsers, team,
                " IT ", "support@example.org", url, " Notes ", verified);
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
        when(teams.getAllTeams()).thenReturn(List.of(Team.builder().id("team").name("IT").build()));
        var result = service.save("SIGNINAPP", request(null, "person", List.of("person", "person"),
                List.of("person"), "team", "https://support.example.org", false));
        assertThat(result.version()).isZero();
        assertThat(result.data().systemOwner().name()).isEqualTo("Ada Hansen");
        assertThat(result.data().administrators()).hasSize(1);
        assertThat(result.data().superUsers()).hasSize(1);
        assertThat(result.data().responsibleTeam().name()).isEqualTo("IT");
        assertThat(result.data().organisationalUnit()).isEqualTo("IT");
        assertThat(result.data().lastVerifiedDate()).isNull();
        verify(employees, times(1)).getResource("person");
    }

    @Test
    void invalidNewEmployeesAndTeamsCannotBeSaved() {
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
        var saved = service.save("SIGNINAPP", request(3L, "person", List.of(), List.of(), "team", "", false));
        assertThat(saved.data().systemOwner()).isEqualTo(person);
        assertThat(saved.data().lastVerifiedDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        verifyNoInteractions(employees, teams);
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
    void unsafeAndMalformedSupportLinksAreRejected() {
        for (String url : List.of("javascript:alert(1)", "https://user:password@example.org", "not a url", "//example.org")) {
            assertThatThrownBy(() -> service.save("SIGNINAPP", request(null, null, List.of(), List.of(), null, url, false)))
                    .isInstanceOf(ValidationException.class);
        }
        verify(repository, never()).saveAndFlush(any());
    }
}
