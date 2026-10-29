package no.nav.data.polly.teams;

import no.nav.data.polly.codelist.CodelistStaticService;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.teams.domain.ProductArea;
import no.nav.data.polly.teams.domain.Team;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@ConditionalOnProperty(name = "client.teamcat-team.enabled", havingValue = "false", matchIfMissing = true)
public class TeamStub implements TeamService {

    @Override
    public List<Team> getAllTeams() {
        return CodelistStaticService.getCodelists(ListName.TEAM).stream()
                .map(code -> Team.builder().id(code.getCode()).name(code.getShortName())
                        .description(code.getDescription()).tags(List.of()).members(List.of()).build())
                .toList();
    }

    @Override
    public Optional<Team> getTeam(String teamId) {
        return getAllTeams().stream().filter(team -> team.getId().equals(teamId)).findFirst();
    }

    @Override
    public List<ProductArea> getAllProductAreas() {
        return List.of();
    }

    @Override
    public Optional<ProductArea> getProductArea(String productAreaId) {
        return Optional.empty();
    }

    @Override
    public List<Team> getTeamsForProductArea(String productAreaId) {
        return List.of();
    }

    @Override
    public boolean teamExists(String teamId) {
        return true;
    }
}
