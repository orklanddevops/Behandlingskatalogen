package no.nav.data.integration.etterlevelse;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class EtterlevelseClientTest {
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
