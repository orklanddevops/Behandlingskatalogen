package no.nav.data.polly.teams;

import no.nav.data.common.rest.RestResponsePage;
import no.nav.data.polly.teams.dto.Resource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@ConditionalOnProperty(name = "client.teamcat-resource.enabled", havingValue = "false", matchIfMissing = true)
public class ResourceStub implements ResourceService {

    @Override
    public Optional<Resource> getResource(String ident) {
        return Optional.empty();
    }

    @Override
    public Map<String, Resource> getResources(Collection<String> idents) {
        return Map.of();
    }

    @Override
    public RestResponsePage<Resource> search(String name) {
        return new RestResponsePage<>(List.of());
    }
}
