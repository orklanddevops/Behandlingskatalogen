package no.nav.data.polly.teams.entra;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import no.nav.data.common.security.azure.AzureTokenProvider;
import no.nav.data.common.exceptions.TechnicalException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static no.nav.data.common.security.azure.AzureConstants.MICROSOFT_GRAPH_SCOPE_APP;

@Component
@ConditionalOnProperty(name = "client.entra-directory.enabled", havingValue = "true")
public class EntraGraphClient {
    private static final String BASE = "https://graph.microsoft.com/v1.0/";
    private final AzureTokenProvider tokens;
    private final ObjectMapper mapper;
    private final RestTemplate http;

    @Autowired
    public EntraGraphClient(AzureTokenProvider tokens, ObjectMapper mapper) {
        this(tokens, mapper, createHttpClient());
    }

    EntraGraphClient(AzureTokenProvider tokens, ObjectMapper mapper, RestTemplate http) {
        this.tokens = tokens;
        this.mapper = mapper;
        this.http = http;
    }

    private static RestTemplate createHttpClient() {
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(15));
        return new RestTemplate(factory);
    }

    public URI uri(String path, Map<String, String> query) {
        var builder = UriComponentsBuilder.fromUriString(BASE + path);
        // Expand as variables so apostrophes, ampersands, plus signs and Unicode remain data.
        query.forEach((key, value) -> builder.queryParam(key, "{" + key + "}"));
        return builder.encode().buildAndExpand(query).toUri();
    }

    public Optional<JsonNode> get(URI uri) {
        validateUri(uri);
        var headers = new HttpHeaders();
        headers.set("ConsistencyLevel", "eventual");
        try {
            headers.setBearerAuth(tokens.getApplicationTokenForResource(MICROSOFT_GRAPH_SCOPE_APP));
            var response = http.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw unavailable();
            }
            JsonNode body = mapper.readTree(response.getBody());
            if (body == null || !body.isObject()) throw unavailable();
            return Optional.of(body);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (RestClientException | JsonProcessingException | TechnicalException e) {
            // Do not expose Graph's directory response, query or credentials to callers/logs.
            throw unavailable();
        }
    }

    public List<JsonNode> list(URI uri, boolean allPages) {
        var values = new ArrayList<JsonNode>();
        var visited = new HashSet<URI>();
        while (uri != null) {
            if (!visited.add(uri)) throw unavailable();
            var page = get(uri).orElseThrow(EntraGraphClient::unavailable);
            if (!page.path("value").isArray()) throw unavailable();
            page.path("value").forEach(values::add);
            String next = page.path("@odata.nextLink").asText("");
            try {
                uri = allPages && !next.isBlank() ? URI.create(next) : null;
            } catch (IllegalArgumentException e) {
                throw unavailable();
            }
        }
        return values;
    }

    private static void validateUri(URI uri) {
        // Paging links carry our application token. Accept only the fixed Microsoft Graph origin.
        if (!"https".equals(uri.getScheme()) || !"graph.microsoft.com".equals(uri.getHost())
                || uri.getRawUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                || !uri.getPath().startsWith("/v1.0/") || uri.getFragment() != null) {
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Entra directory lookup is unavailable. Check Graph permissions and connection.");
    }
}
