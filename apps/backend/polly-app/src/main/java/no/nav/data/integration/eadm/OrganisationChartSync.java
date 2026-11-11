package no.nav.data.integration.eadm;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganisationChartSync {
    private final EadmProperties properties;
    private final EadmClient client;
    private final EadmChartParser parser;
    private final OrganisationChartStore store;
    private final ApplicationEventPublisher events;

    @Scheduled(cron = "${client.eadm.cron:0 0 4 * * *}", zone = "Europe/Oslo")
    public void dailyRefresh() {
        if (properties.isEnabled()) refresh();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        if (!properties.isEnabled()) return;
        var chart = store.get();
        // Seed a new installation and catch up after downtime; restarts reuse a recent chart.
        if (chart.getRetrievedAt() == null || chart.getRetrievedAt().isBefore(Instant.now().minus(Duration.ofDays(1)))
                || chart.getUnits().stream().anyMatch(u -> u.unitType() == null || u.unitType().isBlank())) {
            refresh();
        } else {
            store.synchronizeCodelists();
            events.publishEvent(new OrganisationChartUpdated());
        }
    }

    public synchronized boolean refresh() {
        if (!properties.isEnabled()) return false;
        Instant attemptedAt = Instant.now();
        try {
            var previous = store.get();
            var chart = parser.parse(client.fetch(), properties.getOrganizationNumber(),
                    properties.getMinimumDepartments(), previous.getUnits().size());
            store.save(chart);
            events.publishEvent(new OrganisationChartUpdated());
            log.info("eADM organisation chart updated: {} departments", chart.getUnits().size());
            return true;
        } catch (Exception e) {
            // Never log the export body or employee names.
            log.warn("eADM organisation sync failed ({}); retaining the last valid chart", e.getClass().getSimpleName());
            store.recordFailure(attemptedAt);
            return false;
        }
    }
}
