package no.nav.data.integration.eadm;

import lombok.RequiredArgsConstructor;
import no.nav.data.polly.codelist.OrganisationCodelistSync;
import no.nav.data.common.storage.domain.GenericStorage;
import no.nav.data.common.storage.domain.GenericStorageRepository;
import no.nav.data.common.storage.domain.StorageType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganisationChartStore {
    // A stable primary key prevents duplicate singleton rows during first-time initialization.
    private static final UUID CHART_ID = UUID.fromString("ea72b2f3-840d-4e72-a481-d5b36ca3f970");
    private final GenericStorageRepository repository;
    private final OrganisationCodelistSync codelists;

    @Transactional(readOnly = true)
    public OrganisationChart get() {
        return repository.findByType(StorageType.ORGANISATION_CHART)
                .map(row -> row.getDataObject(OrganisationChart.class)).orElseGet(OrganisationChart::new);
    }

    @Transactional
    public void save(OrganisationChart chart) {
        var row = repository.findByType(StorageType.ORGANISATION_CHART)
                .orElseGet(() -> GenericStorage.builder().id(CHART_ID).type(StorageType.ORGANISATION_CHART).build());
        row.setDataObject(chart);
        repository.save(row);
        codelists.replace(chart);
    }

    @Transactional
    public void synchronizeCodelists() {
        codelists.replace(get());
    }

    @Transactional
    public void recordFailure(Instant attemptedAt) {
        var chart = get();
        chart.setLastAttemptAt(attemptedAt);
        chart.setLastError("Oppdateringen fra eADM mislyktes. Forrige gyldige organisasjonskart beholdes.");
        var row = repository.findByType(StorageType.ORGANISATION_CHART)
                .orElseGet(() -> GenericStorage.builder().id(CHART_ID).type(StorageType.ORGANISATION_CHART).build());
        row.setDataObject(chart);
        repository.save(row);
    }
}
