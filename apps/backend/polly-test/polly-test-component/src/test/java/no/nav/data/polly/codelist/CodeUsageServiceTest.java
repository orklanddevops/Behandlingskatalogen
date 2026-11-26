package no.nav.data.polly.codelist;

import no.nav.data.common.exceptions.CodelistNotErasableException;
import no.nav.data.integration.eadm.OrganisationChartStore;
import no.nav.data.polly.codelist.codeusage.CodeUsageService;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.codelist.dto.CodelistRequestValidator;
import no.nav.data.polly.disclosure.domain.DisclosureRepository;
import no.nav.data.polly.document.domain.Document;
import no.nav.data.polly.document.domain.DocumentData;
import no.nav.data.polly.document.domain.DocumentRepository;
import no.nav.data.polly.informationtype.InformationTypeRepository;
import no.nav.data.polly.policy.domain.PolicyRepository;
import no.nav.data.polly.process.domain.repo.ProcessRepository;
import no.nav.data.polly.process.dpprocess.domain.repo.DpProcessRepository;
import no.nav.data.polly.processor.domain.repo.ProcessorRepository;
import no.nav.data.polly.systeminformation.SystemInformationRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static no.nav.data.polly.codelist.CodelistUtils.createCodelist;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CodeUsageServiceTest {
    @Test
    void replacingDataAccessClassUpdatesAllMatchingDocumentsAndAllowsDeletingTheOldCode() {
        var documents = mock(DocumentRepository.class);
        var service = new CodeUsageService(mock(ProcessRepository.class), mock(DpProcessRepository.class),
                mock(PolicyRepository.class), mock(InformationTypeRepository.class), mock(DisclosureRepository.class),
                documents, mock(ProcessorRepository.class), mock(CodelistRequestValidator.class),
                mock(SystemInformationRepository.class));
        var first = document("First", "TEST");
        var second = document("Second", "TEST");
        var other = document("Other", "RESTRICTED");
        var existing = document("Already open", "OPEN");
        var all = List.of(first, second, other, existing);
        when(documents.findByDataAccessClass(anyString())).thenAnswer(call -> all.stream()
                .filter(document -> document.getData().getDataAccessClass().equals(call.getArgument(0))).toList());
        when(documents.findAllById(any())).thenAnswer(call -> {
            Iterable<UUID> ids = call.getArgument(0);
            var result = new java.util.ArrayList<Document>();
            ids.forEach(id -> all.stream().filter(document -> document.getId().equals(id)).forEach(result::add));
            return result;
        });
        var codes = mock(CodelistRepository.class);
        var oldCode = createCodelist(ListName.DATA_ACCESS_CLASS, "TEST");
        when(codes.findByListAndCode(ListName.DATA_ACCESS_CLASS, "TEST")).thenReturn(Optional.of(oldCode));
        var validator = new CodelistRequestValidator(service, codes);
        var codelists = new CodelistService(codes, mock(OrganisationChartStore.class), validator);

        assertThatThrownBy(() -> codelists.delete(ListName.DATA_ACCESS_CLASS, "TEST"))
                .isInstanceOf(CodelistNotErasableException.class);
        verify(codes, never()).delete(any());

        service.replaceUsage(ListName.DATA_ACCESS_CLASS, "TEST", "OPEN", null);

        assertThat(List.of(first, second)).allSatisfy(document -> {
            assertThat(document.getData().getDataAccessClass()).isEqualTo("OPEN");
            assertThat(document.getData().getDescription()).isEqualTo("Keep description");
            assertThat(document.getData().getInformationTypes()).isEmpty();
        });
        assertThat(first.getData().getName()).isEqualTo("First");
        assertThat(second.getData().getName()).isEqualTo("Second");
        assertThat(other.getData().getDataAccessClass()).isEqualTo("RESTRICTED");
        assertThat(service.findCodeUsage(ListName.DATA_ACCESS_CLASS, "TEST").isInUse()).isFalse();
        assertThat(service.findCodeUsage(ListName.DATA_ACCESS_CLASS, "OPEN").getDocuments()).hasSize(3);
        codelists.delete(ListName.DATA_ACCESS_CLASS, "TEST");
        verify(codes).delete(oldCode);

        // Repeating the action after replacement must have no further effect.
        assertThat(service.replaceUsage(ListName.DATA_ACCESS_CLASS, "TEST", "RESTRICTED", null).isInUse()).isFalse();
        assertThat(first.getData().getDataAccessClass()).isEqualTo("OPEN");
        assertThat(existing.getData().getDataAccessClass()).isEqualTo("OPEN");
    }

    private Document document(String name, String code) {
        return Document.builder().id(UUID.randomUUID()).data(DocumentData.builder()
                .name(name).description("Keep description").informationTypes(List.of()).dataAccessClass(code).build()).build();
    }
}
