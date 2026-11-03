package no.nav.data.common.security.azure;

import com.microsoft.graph.serviceclient.GraphServiceClient;
import no.nav.data.common.exceptions.ValidationException;
import no.nav.data.common.mail.MailTask;
import no.nav.data.common.security.azure.AzureAdService;
import no.nav.data.common.security.azure.AzureTokenProvider;
import no.nav.data.common.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OutboundMailTest {
    @Test
    void outboundDeliveryIsDisabledByDefaultEvenForQueuedMessages() {
        var tokens = mock(AzureTokenProvider.class);
        var storage = mock(StorageService.class);
        var sender = new AzureAdService(tokens, storage);
        assertThatThrownBy(() -> sender.sendMail(MailTask.builder().to("person@nav.no").build()))
                .isInstanceOf(ValidationException.class).hasMessageContaining("deaktivert");
        verifyNoInteractions(tokens, storage);
    }

    @Test
    void navAndOtherDomainsAreBlockedEvenIfMailIsEnabledLater() {
        var tokens = mock(AzureTokenProvider.class);
        var storage = mock(StorageService.class);
        var sender = new AzureAdService(tokens, storage);
        ReflectionTestUtils.setField(sender, "mailEnabled", true);
        for (String recipient : new String[]{"person@nav.no", "person@orkland.kommune.no.evil.org", "person@external.org", "a@orkland.kommune.no;b@nav.no"}) {
            assertThatThrownBy(() -> sender.sendMail(MailTask.builder().to(recipient).build()))
                    .isInstanceOf(ValidationException.class).hasMessageContaining("Orkland");
        }
        verifyNoInteractions(tokens, storage);
    }

    @Test
    void orklandRecipientsCanBeDeliveredWhenExplicitlyEnabled() {
        var tokens = mock(AzureTokenProvider.class);
        var storage = mock(StorageService.class);
        var graph = mock(GraphServiceClient.class, RETURNS_DEEP_STUBS);
        when(tokens.getMailAccessToken()).thenReturn("test-token");
        when(tokens.getGraphClient("test-token")).thenReturn(graph);
        var sender = new AzureAdService(tokens, storage);
        ReflectionTestUtils.setField(sender, "mailEnabled", true);
        sender.sendMail(MailTask.builder().to("person@orkland.kommune.no").subject("Test").body("Test").build());
        verify(graph.me().sendMail()).post(any());
        verify(storage).save(any(no.nav.data.common.storage.domain.GenericStorageData.class));
    }
}
