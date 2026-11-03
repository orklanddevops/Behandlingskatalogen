package no.nav.data.polly.teams;

import no.nav.data.common.rest.RestResponsePage;
import no.nav.data.polly.teams.dto.Resource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@ConditionalOnExpression("!${client.entra-directory.enabled:false} && !${client.teamcat-resource.enabled:false}")
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
