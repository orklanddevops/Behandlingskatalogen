package no.nav.data.polly.teams.entra;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import no.nav.data.polly.teams.TeamService;
import no.nav.data.polly.teams.TeamStub;
import no.nav.data.polly.teams.domain.Member;
import no.nav.data.polly.teams.domain.ProductArea;
import no.nav.data.polly.teams.domain.Team;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "client.entra-directory.enabled", havingValue = "true")
public class EntraTeamService implements TeamService {
    private final EntraGraphClient graph;
    private final EntraDirectoryProperties properties;
    private final TeamStub localTeams = new TeamStub();
    private final LoadingCache<UUID, Optional<Team>> groups;
    private final LoadingCache<UUID, List<Member>> members;

    public EntraTeamService(EntraGraphClient graph, EntraDirectoryProperties properties) {
        this.graph = graph;
        this.properties = properties;
        groups = Caffeine.newBuilder().maximumSize(1000).expireAfterWrite(Duration.ofMinutes(5)).build(this::fetchGroup);
        members = Caffeine.newBuilder().maximumSize(1000).expireAfterWrite(Duration.ofMinutes(5)).build(this::fetchMembers);
    }

    @Override
    public List<Team> getAllTeams() {
        var teams = new LinkedHashMap<String, Team>();
        localTeams.getAllTeams().forEach(team -> teams.put(team.getId(), team));
        properties.getGroupIds().forEach(id -> groups.get(id).ifPresent(team -> teams.put(team.getId(), team)));
        return teams.values().stream().sorted(Comparator.comparing(Team::getName, String.CASE_INSENSITIVE_ORDER)).toList();
    }

    @Override
    public Optional<Team> getTeam(String id) {
        if (!EntraResourceService.isObjectId(id) || !properties.getGroupIds().contains(UUID.fromString(id))) {
            return localTeams.getTeam(id);
        }
        UUID groupId = UUID.fromString(id);
        return groups.get(groupId).map(team -> Team.builder().id(team.getId()).name(team.getName())
                .description(team.getDescription()).tags(team.getTags()).members(members.get(groupId)).build());
    }

    private Optional<Team> fetchGroup(UUID id) {
        return graph.get(graph.uri("groups/" + id, Map.of("$select", "id,displayName,description")))
                .map(group -> Team.builder().id(group.path("id").asText())
                        .name(group.path("displayName").asText()).description(group.path("description").asText(""))
                        .tags(List.of()).members(List.of()).build());
    }

    private List<Member> fetchMembers(UUID id) {
        return graph.list(graph.uri("groups/" + id + "/transitiveMembers/microsoft.graph.user",
                        Map.of("$select", EntraResourceService.SELECT, "$top", "999", "$count", "true")), true)
                .stream().filter(EntraResourceService::isEmployee).map(EntraResourceService::convert)
                .map(user -> Member.builder().name(user.getFullName()).email(user.getEmail()).build())
                .sorted(Comparator.comparing(Member::getName, String.CASE_INSENSITIVE_ORDER)).toList();
    }

    @Override
    public boolean teamExists(String id) {
        return getAllTeams().stream().anyMatch(team -> team.getId().equalsIgnoreCase(id));
    }

    // Entra groups do not define NAV product areas.
    @Override public List<ProductArea> getAllProductAreas() { return List.of(); }
    @Override public Optional<ProductArea> getProductArea(String id) { return Optional.empty(); }
    @Override public List<Team> getTeamsForProductArea(String id) { return List.of(); }
}
