package no.nav.data.polly.teams.entra;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import no.nav.data.common.rest.RestResponsePage;
import no.nav.data.polly.teams.ResourceService;
import no.nav.data.polly.teams.dto.Resource;
import no.nav.data.polly.teams.dto.ResourceType;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Arrays;

@Service
@ConditionalOnProperty(name = "client.entra-directory.enabled", havingValue = "true")
public class EntraResourceService implements ResourceService {
    static final String SELECT = "id,displayName,givenName,surname,mail,userPrincipalName,userType,accountEnabled";
    private final EntraGraphClient graph;
    private final LoadingCache<String, Optional<Resource>> resources;

    public EntraResourceService(EntraGraphClient graph) {
        this.graph = graph;
        resources = Caffeine.newBuilder().maximumSize(2000).expireAfterWrite(Duration.ofMinutes(5))
                .build(this::fetch);
    }

    @Override
    public Optional<Resource> getResource(String ident) {
        if (!isObjectId(ident)) return Optional.empty();
        return resources.get(ident.toLowerCase(java.util.Locale.ROOT));
    }

    @Override
    public Map<String, Resource> getResources(Collection<String> idents) {
        var result = new LinkedHashMap<String, Resource>();
        idents.stream().distinct().forEach(id -> getResource(id).ifPresent(resource -> result.put(id, resource)));
        return result;
    }

    @Override
    public RestResponsePage<Resource> search(String name) {
        if (name == null || name.trim().length() < 3) return new RestResponsePage<>(java.util.List.of());
        var query = new LinkedHashMap<String, String>();
        query.put("$select", SELECT);
        query.put("$top", "25");
        query.put("$count", "true");
        query.put("$filter", "accountEnabled eq true and userType eq 'Member'");
        if (name.contains("@")) {
            String email = name.trim().replace("'", "''");
            query.put("$filter", query.get("$filter") + " and (startswith(mail,'" + email
                    + "') or startswith(userPrincipalName,'" + email + "'))");
        } else {
            // Graph tokenizes displayName, so middle names match even when omitted from email.
            String terms = Arrays.stream(name.trim().split("\\s+"))
                    .map(term -> term.replace("\\", "\\\\").replace("\"", "\\\""))
                    .map(term -> "\"displayName:" + term + "\"")
                    .collect(Collectors.joining(" AND "));
            query.put("$search", terms);
        }
        var uri = graph.uri("users", query);
        return new RestResponsePage<>(graph.list(uri, false).stream().filter(EntraResourceService::isEmployee)
                .map(EntraResourceService::convert).toList());
    }

    private Optional<Resource> fetch(String id) {
        return graph.get(graph.uri("users/" + id, Map.of("$select", SELECT)))
                .filter(EntraResourceService::isEmployee).map(EntraResourceService::convert);
    }

    static boolean isEmployee(JsonNode user) {
        return user.path("accountEnabled").asBoolean(false) && "Member".equals(user.path("userType").asText())
                && isObjectId(user.path("id").asText()) && !user.path("displayName").asText("").isBlank();
    }

    static Resource convert(JsonNode user) {
        String mail = user.path("mail").asText("");
        return Resource.builder().navIdent(user.path("id").asText())
                .givenName(user.path("givenName").asText("")).familyName(user.path("surname").asText(""))
                .fullName(user.path("displayName").asText())
                .email(mail.isBlank() ? user.path("userPrincipalName").asText("") : mail)
                .resourceType(ResourceType.INTERNAL).build();
    }

    static boolean isObjectId(String value) {
        if (value == null) return false;
        try {
            return UUID.fromString(value).toString().equalsIgnoreCase(value);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
