package no.nav.data.polly.codelist;

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
