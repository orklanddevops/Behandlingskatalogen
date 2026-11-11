package no.nav.data.integration.eadm;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

class EadmClientTest {
    @Test
    void postsTheOrganisationNumberWithoutUserCredentialsAndRejectsUpstreamFailures() throws Exception {
        var status = new AtomicInteger(200);
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/export", exchange -> {
            assertThat(exchange.getRequestMethod()).isEqualTo("POST");
            assertThat(exchange.getRequestHeaders().getFirst("Content-Type")).startsWith("application/x-www-form-urlencoded");
            assertThat(exchange.getRequestHeaders().getFirst("Authorization")).isNull();
            assertThat(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("orgnr=NO123");
            byte[] body = (status.get() == 200 ? "{\"returncode\":0,\"data\":[]}" : "Not an export").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status.get(), body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        try {
            var properties = new EadmProperties();
            properties.setOrganizationNumber("NO123");
            properties.setUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/export");
            var client = new EadmClient(properties);
            assertThat(client.fetch().path("returncode").asInt()).isZero();
            status.set(503);
            assertThatThrownBy(client::fetch).hasMessage("eADM returned HTTP 503");
        } finally {
            server.stop(0);
        }
    }
}
