package no.nav.data.common.security.azure;


import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import no.nav.data.common.mail.EmailProvider;
import no.nav.data.common.mail.MailTask;
import no.nav.data.common.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static no.nav.data.common.security.azure.support.MailMessage.compose;

@Slf4j
@Service
@RequiredArgsConstructor
public class AzureAdService implements EmailProvider {

    private final AzureTokenProvider azureTokenProvider;
    private final StorageService storage;

    @org.springframework.beans.factory.annotation.Value("${polly.mail.enabled:false}")
    private boolean mailEnabled;

    @Override
    @Transactional
    public void sendMail(MailTask mailTask) {
        if (!mailEnabled) {
            throw new no.nav.data.common.exceptions.ValidationException("E-postutsending er deaktivert.");
        }
        String recipient = mailTask.getTo() == null ? "" : mailTask.getTo().trim().toLowerCase(java.util.Locale.ROOT);
        if (!recipient.matches("[^\\s@,;<>]+@orkland\\.kommune\\.no")) {
            throw new no.nav.data.common.exceptions.ValidationException("E-post kan bare sendes til Orkland kommune.");
        }
        log.info("sending mail {} to {}", mailTask.getSubject(), mailTask.getTo());
        SendMailPostRequestBody sendMailPostRequestBody = new SendMailPostRequestBody();
        sendMailPostRequestBody.setMessage(compose(mailTask.getTo(), mailTask.getSubject(), mailTask.getBody()));
        sendMailPostRequestBody.setSaveToSentItems(true);

        getMailGraphClient().me().sendMail().post(sendMailPostRequestBody);
        storage.save(mailTask.toMailLog());
    }

    private GraphServiceClient getMailGraphClient() {
        return azureTokenProvider.getGraphClient(azureTokenProvider.getMailAccessToken());
    }

}
