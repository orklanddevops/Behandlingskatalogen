package no.nav.data.polly.systeminformation;

import no.nav.data.common.exceptions.ValidationException;
import no.nav.data.polly.process.domain.repo.ProcessRepository;
import no.nav.data.polly.processor.ProcessorService;
import no.nav.data.polly.processor.domain.repo.ProcessorRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SystemSupplierDeletionTest {
    @Test
    void supplierCanOnlyBeDeletedOnceSystemReferencesHaveBeenRemoved() {
        var suppliers = mock(ProcessorRepository.class);
        var processes = mock(ProcessRepository.class);
        var systems = mock(SystemInformationRepository.class);
        var service = new ProcessorService(suppliers, processes, systems);
        var id = UUID.randomUUID();
        when(systems.findBySupplierId(id)).thenReturn(List.of(new SystemInformation()));
        assertThatThrownBy(() -> service.deleteById(id)).isInstanceOf(ValidationException.class);
        verify(suppliers, never()).deleteById(id);
        when(systems.findBySupplierId(id)).thenReturn(List.of());
        service.deleteById(id);
        verify(suppliers).deleteById(id);
    }
}
