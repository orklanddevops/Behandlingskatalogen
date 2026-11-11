package no.nav.data.integration.eadm;

import no.nav.data.common.storage.domain.GenericStorage;
import no.nav.data.common.storage.domain.GenericStorageRepository;
import no.nav.data.common.storage.domain.StorageType;
import no.nav.data.common.utils.JsonUtils;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganisationChartSyncTest {
    private OrganisationChart chart() {
        var chart = new OrganisationChart();
        chart.setRetrievedAt(Instant.now());
        chart.setUnits(List.of(new OrganisationUnit("1", null, "Saved department", "")));
        return chart;
    }

    @Test
    void cachedReadsNeverCallEadmAndDisabledJobsDoNothing() {
        var properties = new EadmProperties();
        var client = mock(EadmClient.class);
        var store = mock(OrganisationChartStore.class);
        var sync = new OrganisationChartSync(properties, client, new EadmChartParser(), store);
        var controller = new OrganisationChartController(properties, store, sync);
        var previous = chart();
        when(store.get()).thenReturn(previous);
        assertThat(controller.get().chart()).isSameAs(previous);
        sync.dailyRefresh();
        sync.initialize();
        assertThat(sync.refresh()).isFalse();
        verifyNoInteractions(client);
        verify(store, never()).save(any());
    }

    @Test
    void failedImportRetainsPersistedDepartmentsAndSuccessfulTimestamp() {
        var properties = new EadmProperties();
        properties.setEnabled(true);
        var repository = mock(GenericStorageRepository.class);
        var previous = chart();
        var row = new GenericStorage(previous);
        when(repository.findByType(StorageType.ORGANISATION_CHART)).thenReturn(Optional.of(row));
        var store = new OrganisationChartStore(repository);
        var client = mock(EadmClient.class);
        when(client.fetch()).thenThrow(new IllegalStateException("upstream unavailable"));
        var sync = new OrganisationChartSync(properties, client, new EadmChartParser(), store);
        assertThat(sync.refresh()).isFalse();
        var saved = row.getDataObject(OrganisationChart.class);
        assertThat(saved.getUnits()).isEqualTo(previous.getUnits());
        assertThat(saved.getRetrievedAt()).isEqualTo(previous.getRetrievedAt());
        assertThat(saved.getLastAttemptAt()).isNotNull();
        assertThat(saved.getLastError()).contains("mislyktes");
        verify(repository).save(row);
    }

    @Test
    void successfulImportReplacesTheCacheAndRestartsReuseRecentSnapshots() {
        var properties = new EadmProperties();
        properties.setEnabled(true);
        properties.setMinimumDepartments(1);
        var store = mock(OrganisationChartStore.class);
        when(store.get()).thenReturn(chart());
        var client = mock(EadmClient.class);
        when(client.fetch()).thenReturn(JsonUtils.toJsonNode("""
                {"returncode":0,"data":[{"syncfields":[
                  {"name":"Department","value":"Fresh department"},
                  {"name":"DepartmentNumber","value":"2"},
                  {"name":"ParentDepartmentNumber","value":"0"}]}]}
                """));
        var sync = new OrganisationChartSync(properties, client, new EadmChartParser(), store);
        sync.initialize();
        verifyNoInteractions(client);
        sync.dailyRefresh();
        verify(client).fetch();
        verify(store).save(argThat(c -> c.getUnits().getFirst().name().equals("Fresh department") && c.getLastError() == null));
        verify(store, never()).recordFailure(any());
    }

    @Test
    void startupSeedsAnEmptyDatabase() {
        var properties = new EadmProperties();
        properties.setEnabled(true);
        var store = mock(OrganisationChartStore.class);
        when(store.get()).thenReturn(new OrganisationChart());
        var client = mock(EadmClient.class);
        when(client.fetch()).thenThrow(new IllegalStateException("offline"));
        new OrganisationChartSync(properties, client, new EadmChartParser(), store).initialize();
        verify(client).fetch();
        verify(store).recordFailure(any());
    }
}
