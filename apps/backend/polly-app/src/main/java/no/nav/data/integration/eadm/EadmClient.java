package no.nav.data.integration.eadm;

import com.fasterxml.jackson.databind.JsonNode;
import no.nav.data.common.utils.JsonUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
public class EadmClient {
    private final EadmProperties properties;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public EadmClient(EadmProperties properties) {
        this.properties = properties;
    }

    public JsonNode fetch() {
        var request = HttpRequest.newBuilder(URI.create(properties.getUrl()))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString("orgnr=" +
                        URLEncoder.encode(properties.getOrganizationNumber(), StandardCharsets.UTF_8)))
                .build();
        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) {
                throw new IllegalStateException("eADM returned HTTP " + response.statusCode());
            }
            if (response.body().length() > 5_000_000) {
                throw new IllegalStateException("eADM response exceeds the size limit");
            }
            try {
                return JsonUtils.toJsonNode(response.body());
            } catch (IllegalArgumentException e) {
                throw new IllegalStateException("eADM returned invalid JSON");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("eADM request interrupted");
        } catch (IOException e) {
            throw new IllegalStateException("eADM request failed");
        }
    }
}
