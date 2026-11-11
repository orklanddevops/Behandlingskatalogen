package no.nav.data.polly.codelist;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import no.nav.data.integration.eadm.OrganisationChart;
import no.nav.data.polly.codelist.codeusage.CodeUsageService;
import no.nav.data.polly.codelist.domain.Codelist;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganisationCodelistSync {
    private final CodelistRepository repository;
    private final CodeUsageService usage;

    @Transactional(propagation = Propagation.MANDATORY)
    public void replace(OrganisationChart chart) {
        var imported = OrganisationCodelists.fromChart(chart);
        var previous = repository.findAll().stream().filter(c -> c.getList().isOrganisation()).toList();
        var byKey = imported.stream().collect(Collectors.toMap(this::key, Function.identity()));
        var byName = imported.stream().collect(Collectors.groupingBy(c -> c.getList() + ":" + normalize(c.getShortName())));
        List<Codelist> obsolete = new ArrayList<>();
        int unmatched = 0;
        for (var old : previous) {
            if (byKey.containsKey(key(old))) continue;
            var matches = byName.getOrDefault(old.getList() + ":" + normalize(old.getShortName()), List.of());
            if (matches.size() == 1) {
                var target = matches.getFirst();
                usage.replaceUsage(old.getList(), old.getCode(), target.getCode(), target.getShortName());
            } else {
                unmatched++;
            }
            obsolete.add(old);
        }
        // Update existing canonical rows in place to retain their audit identity.
        var oldByKey = previous.stream().collect(Collectors.toMap(this::key, Function.identity()));
        var save = imported.stream().map(code -> {
            var existing = oldByKey.get(key(code));
            if (existing == null) return code;
            existing.setShortName(code.getShortName());
            existing.setDescription(code.getDescription());
            return existing;
        }).toList();
        repository.saveAll(save);
        repository.deleteAll(obsolete);
        log.info("Organisation categories synchronized: {} imported, {} obsolete removed, {} without an unambiguous name match",
                imported.size(), obsolete.size(), unmatched);
    }

    private String key(Codelist code) { return code.getList() + ":" + code.getCode(); }
    private String normalize(String name) { return name == null ? "" : name.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
}
