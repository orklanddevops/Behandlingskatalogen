package no.nav.data.integration.etterlevelse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestTemplate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class EtterlevelseClientTest {
    private MockEnvironment applicationEnvironment() throws Exception {
        var environment = new MockEnvironment();
        environment.getPropertySources().addLast(new PropertiesPropertySource("application",
                PropertiesLoaderUtils.loadProperties(new ClassPathResource("application.properties"))));
        return environment;
    }

    @Test
    void disabledIntegrationBindsWithoutUrlOverride() throws Exception {
        var environment = applicationEnvironment().withProperty("client.etterlevelse.enabled", "false");
        var properties = Binder.get(environment)
                .bind("client.etterlevelse", Bindable.of(EtterlevelseClientProperties.class)).get();
        assertThat(properties.isEnabled()).isFalse();
        assertThat(properties.getUrl()).isEmpty();
    }

    @Test
    void configuredUrlCanStillBeBound() throws Exception {
        var environment = applicationEnvironment()
                .withProperty("CLIENT_ETTERLEVELSE_URL", "https://etterlevelse.example.test");
        var properties = Binder.get(environment)
                .bind("client.etterlevelse", Bindable.of(EtterlevelseClientProperties.class)).get();
        assertThat(properties.getUrl()).isEqualTo("https://etterlevelse.example.test");
    }

    @Test
    void disabledIntegrationDoesNotCallExternalService() {
        var template = mock(RestTemplate.class);
        var properties = new EtterlevelseClientProperties();
        properties.setUrl("https://must-not-be-called.invalid");
        properties.setEnabled(false);
        assertThat(new EtterlevelseClient(template, properties)
                .getPvkDokumentForBehandling(UUID.randomUUID())).isEmpty();
        verifyNoInteractions(template);
    }

    @Test
    void missingUrlDoesNotProduceServerError() {
        var template = mock(RestTemplate.class);
        assertThat(new EtterlevelseClient(template, new EtterlevelseClientProperties())
                .getPvkDokumentForBehandling(UUID.randomUUID())).isEmpty();
        verifyNoInteractions(template);
    }
}
