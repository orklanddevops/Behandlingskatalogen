package no.nav.data.polly.process;

import no.nav.data.polly.process.domain.sub.QualitySystemLinks;
import no.nav.data.polly.process.dto.ProcessRequest;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class QualitySystemLinksTest {
    @Test
    void linksAreOptionalForExistingRequests() {
        var request = new ProcessRequest();
        request.format();
        assertThat(request.getQualitySystemLinks()).isNotNull();
        assertThat(request.getQualitySystemLinks().validateFields()).isEmpty();
    }

    @Test
    void acceptsAndTrimsHttpLinksButRejectsUnsafeSchemes() {
        var links = new QualitySystemLinks();
        links.setDpia(" https://quality.example.org/dpia/42 ");
        links.setRos("http://quality.example.org/ros/1");
        assertThat(links.validateFields()).isEmpty();
        assertThat(links.getDpia()).isEqualTo("https://quality.example.org/dpia/42");
        links.setDpia("javascript:alert(1)");
        assertThat(links.validateFields()).hasSize(1);
    }
}
