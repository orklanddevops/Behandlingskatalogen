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
    @Test
    void validatesNamedDocumentsAndConfiguredTypes() {
        no.nav.data.polly.codelist.CodelistStub.initializeCodelist();
        var document = new QualitySystemLinks.Document();
        document.setType(" DPIA ");
        document.setName(" Assessment ");
        document.setUrl(" https://quality.example.org/dpia/42 ");
        var links = new QualitySystemLinks();
        links.setDocuments(java.util.List.of(document));
        assertThat(links.validateFields()).isEmpty();
        assertThat(document.getType()).isEqualTo("DPIA");
        assertThat(document.getName()).isEqualTo("Assessment");
        assertThat(document.getUrl()).isEqualTo("https://quality.example.org/dpia/42");
        document.setType("UNKNOWN");
        assertThat(links.validateFields()).hasSize(1);
        document.setType("DPIA");
        document.setName(" ");
        document.setUrl("javascript:alert(1)");
        assertThat(links.validateFields()).hasSize(2);
        document.setName("Assessment");
        document.setUrl("");
        assertThat(links.validateFields()).hasSize(1);
    }

    @Test
    void rejectsNullDocumentRows() {
        var links = new QualitySystemLinks();
        links.setDocuments(java.util.Arrays.asList((QualitySystemLinks.Document) null));
        assertThat(links.validateFields()).hasSize(1);
    }
}
