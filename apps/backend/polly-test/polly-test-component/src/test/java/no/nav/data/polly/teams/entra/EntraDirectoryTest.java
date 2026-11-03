package no.nav.data.polly.teams.entra;

import com.fasterxml.jackson.databind.ObjectMapper;
import no.nav.data.common.security.azure.AzureTokenProvider;
import no.nav.data.polly.codelist.CodelistStaticService;
import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static no.nav.data.common.security.azure.AzureConstants.MICROSOFT_GRAPH_SCOPE_APP;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class EntraDirectoryTest {
    private static final String USER = "11111111-1111-4111-8111-111111111111";
    private static final String GROUP = "526beb77-dc8d-4b5a-a7f7-7b6f504fd71b";
    private static final String EMPLOYEE = """
            {"id":"%s","displayName":"Ada Hansen","givenName":"Ada","surname":"Hansen",
             "mail":null,"userPrincipalName":"ada@example.org","userType":"Member","accountEnabled":true}
            """.formatted(USER);
    private MockRestServiceServer server;
    private EntraGraphClient graph;
    private EntraResourceService resources;
    private AzureTokenProvider tokens;

    @BeforeEach
    void setup() {
        var http = new RestTemplate();
        server = MockRestServiceServer.bindTo(http).build();
        tokens = mock(AzureTokenProvider.class);
        when(tokens.getApplicationTokenForResource(MICROSOFT_GRAPH_SCOPE_APP)).thenReturn("application-token");
        graph = new EntraGraphClient(tokens, new ObjectMapper(), http);
        resources = new EntraResourceService(graph);
    }

    @Test
    void searchEscapesODataAndEncodesUnicodeAndSpecialCharacters() {
        server.expect(request -> {
            String query = URLDecoder.decode(request.getURI().getRawQuery(), StandardCharsets.UTF_8);
            assertThat(query).contains("O''Dø+&", "accountEnabled eq true", "userType eq 'Member'", "$top=25");
        }).andExpect(header("Authorization", "Bearer application-token"))
                .andExpect(header("ConsistencyLevel", "eventual"))
                .andRespond(withSuccess("{\"value\":[" + EMPLOYEE + "]}", MediaType.APPLICATION_JSON));
        var result = resources.search("O'Dø+&").getContent();
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getNavIdent()).isEqualTo(USER);
        assertThat(result.getFirst().getEmail()).isEqualTo("ada@example.org");
        server.verify();
    }

    @Test
    void fullNameSearchCombinesWordsAndExcludesGuestsAndDisabledUsers() {
        server.expect(request -> {
            String query = URLDecoder.decode(request.getURI().getRawQuery(), StandardCharsets.UTF_8);
            assertThat(query).contains("startswith(givenName,'Ada')", "startswith(surname,'Hansen')", ") and (");
        }).andRespond(withSuccess("{\"value\":[" + EMPLOYEE + ","
                + EMPLOYEE.replace("Member", "Guest") + "," + EMPLOYEE.replace("true", "false") + "]}", MediaType.APPLICATION_JSON));
        assertThat(resources.search("  Ada   Hansen  ").getContent()).hasSize(1);
        server.verify();
    }

    @Test
    void lookupUsesStableObjectIdsAndCachesSuccessfulResults() {
        server.expect(request -> assertThat(request.getURI().getPath()).isEqualTo("/v1.0/users/" + USER))
                .andRespond(withSuccess(EMPLOYEE, MediaType.APPLICATION_JSON));
        assertThat(resources.getResource(USER)).isPresent();
        assertThat(resources.getResources(List.of(USER, USER, "migration"))).containsOnlyKeys(USER);
        server.verify();
    }

    @Test
    void shortSearchesAndLegacyIdsDoNotCallGraph() {
        assertThat(resources.search("ab").getContent()).isEmpty();
        assertThat(resources.getResource("A123456")).isEmpty();
        assertThat(resources.getResource("../groups/" + GROUP)).isEmpty();
        verify(tokens, never()).getApplicationTokenForResource(MICROSOFT_GRAPH_SCOPE_APP);
    }

    @Test
    void deletedUserReturnsEmpty() {
        server.expect(anything()).andRespond(withResourceNotFound());
        assertThat(resources.getResource(USER)).isEmpty();
        server.verify();
    }

    @Test
    void permissionFailureIsSanitizedAndIsNotCachedAsEmpty() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN).body("sensitive upstream body"));
        server.expect(anything()).andRespond(withSuccess(EMPLOYEE, MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> resources.getResource(USER)).isInstanceOf(ResponseStatusException.class)
                .hasMessageNotContaining("sensitive upstream body");
        assertThat(resources.getResource(USER)).isPresent();
        server.verify();
    }

    @Test
    void groupMembersFollowAllPages() {
        URI first = graph.uri("groups/" + GROUP + "/transitiveMembers/microsoft.graph.user", Map.of());
        String next = "https://graph.microsoft.com/v1.0/groups/" + GROUP + "/transitiveMembers?$skiptoken=next";
        server.expect(requestTo(first)).andRespond(withSuccess("{\"value\":[" + EMPLOYEE
                + "],\"@odata.nextLink\":\"" + next + "\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(next)).andRespond(withSuccess("{\"value\":[" + EMPLOYEE + "]}", MediaType.APPLICATION_JSON));
        assertThat(graph.list(first, true)).hasSize(2);
        server.verify();
    }

    @Test
    void searchDoesNotDownloadTheEntireDirectory() {
        server.expect(anything()).andRespond(withSuccess("{\"value\":[],\"@odata.nextLink\":\"https://graph.microsoft.com/v1.0/users?next=1\"}", MediaType.APPLICATION_JSON));
        assertThat(resources.search("Hansen").getContent()).isEmpty();
        server.verify();
    }

    @Test
    void pagingNeverSendsTokensToAnotherHost() {
        server.expect(anything()).andRespond(withSuccess("{\"value\":[],\"@odata.nextLink\":\"https://example.org/steal\"}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> graph.list(graph.uri("users", Map.of()), true)).isInstanceOf(ResponseStatusException.class);
        verify(tokens, times(1)).getApplicationTokenForResource(MICROSOFT_GRAPH_SCOPE_APP);
        server.verify();
    }

    @Test
    void selectedGroupLoadsAndCachesMembersAndPreservesLocalTeams() {
        var properties = new EntraDirectoryProperties();
        properties.setGroupIds(Set.of(UUID.fromString(GROUP)));
        var teams = new EntraTeamService(graph, properties);
        try (var codes = mockStatic(CodelistStaticService.class)) {
            codes.when(() -> CodelistStaticService.getCodelists(ListName.TEAM))
                    .thenReturn(List.of(Codelist.builder().code("LOCAL").shortName("Local team").build()));
            server.expect(request -> assertThat(request.getURI().getPath()).isEqualTo("/v1.0/groups/" + GROUP))
                    .andRespond(withSuccess("{\"id\":\"" + GROUP + "\",\"displayName\":\"Organisasjon og utvikling - IT\"}", MediaType.APPLICATION_JSON));
            server.expect(request -> assertThat(request.getURI().getPath()).endsWith("/transitiveMembers/microsoft.graph.user"))
                    .andRespond(withSuccess("{\"value\":[" + EMPLOYEE + "]}", MediaType.APPLICATION_JSON));
            assertThat(teams.getAllTeams()).extracting(t -> t.getId()).containsExactlyInAnyOrder("LOCAL", GROUP);
            assertThat(teams.getTeam(GROUP).orElseThrow().getMembers()).hasSize(1);
            assertThat(teams.getTeam(GROUP).orElseThrow().getMembers().getFirst().getEmail()).isEqualTo("ada@example.org");
            assertThat(teams.getTeam(USER)).isEmpty();
            assertThat(teams.teamExists("UNKNOWN")).isFalse();
            assertThat(teams.teamExists("LOCAL")).isTrue();
            server.verify();
        }
    }

    @Test
    void invalidGraphPayloadDoesNotBecomeAnEmptyResult() {
        server.expect(anything()).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> graph.list(graph.uri("users", Map.of()), true)).isInstanceOf(ResponseStatusException.class);
    }
    @Test
    void tokenFailureReturnsUnavailableWithoutLeakingTheCause() {
        when(tokens.getApplicationTokenForResource(MICROSOFT_GRAPH_SCOPE_APP))
                .thenThrow(new no.nav.data.common.exceptions.TechnicalException("sensitive token failure"));
        assertThatThrownBy(() -> resources.search("Hansen")).isInstanceOf(ResponseStatusException.class)
                .hasMessageNotContaining("sensitive token failure");
    }

    @Test
    void throttlingReturnsUnavailableAndCanBeRetried() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(anything()).andRespond(withSuccess("{\"value\":[]}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> resources.search("Hansen")).isInstanceOf(ResponseStatusException.class);
        assertThat(resources.search("Hansen").getContent()).isEmpty();
        server.verify();
    }

}
