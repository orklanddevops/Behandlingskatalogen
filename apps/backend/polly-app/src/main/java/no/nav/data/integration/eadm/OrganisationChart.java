package no.nav.data.integration.eadm;

import lombok.Data;
import no.nav.data.common.storage.domain.ChangeStamp;
import no.nav.data.common.storage.domain.GenericStorageData;

import java.time.Instant;
import java.util.List;

@Data
public class OrganisationChart implements GenericStorageData {
    private String organizationNumber;
    private String queryId;
    private Instant retrievedAt;
    private Instant lastAttemptAt;
    private String lastError;
    private List<OrganisationUnit> units = List.of();
    private ChangeStamp changeStamp;
}
