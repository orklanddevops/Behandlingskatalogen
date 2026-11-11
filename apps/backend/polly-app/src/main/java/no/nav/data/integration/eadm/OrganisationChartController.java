package no.nav.data.integration.eadm;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/organisation")
@RequiredArgsConstructor
public class OrganisationChartController {
    private final EadmProperties properties;
    private final OrganisationChartStore store;
    private final OrganisationChartSync sync;

    @GetMapping
    public ChartStatus get() {
        // Reading this endpoint never calls eADM.
        return new ChartStatus(properties.isEnabled(), store.get());
    }

    @PostMapping("/refresh")
    public ChartStatus refresh() {
        if (!properties.isEnabled()) throw new ResponseStatusException(HttpStatus.CONFLICT, "eADM synchronization is disabled");
        if (!sync.refresh()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "eADM synchronization failed");
        return get();
    }

    public record ChartStatus(boolean syncEnabled, OrganisationChart chart) {}
}
