package no.nav.data.polly.codelist;

import no.nav.data.integration.eadm.OrganisationChart;
import no.nav.data.integration.eadm.OrganisationUnit;
import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class OrganisationCodelists {
    private OrganisationCodelists() {}

    public static List<Codelist> fromChart(OrganisationChart chart) {
        var byId = chart.getUnits().stream().collect(Collectors.toMap(OrganisationUnit::id, Function.identity()));
        List<Codelist> result = new ArrayList<>();
        for (var unit : chart.getUnits()) {
            int depth = 0;
            boolean excluded = false;
            var current = unit;
            Set<String> visited = new HashSet<>();
            while (current != null) {
                if (!visited.add(current.id()) || visited.size() > 100)
                    throw new IllegalArgumentException("Invalid organisation hierarchy");
                String type = current.unitType() == null ? "" : current.unitType().strip().toLowerCase(Locale.ROOT);
                if (type.equals("personer uten arbeidsforhold")) {
                    excluded = true;
                    break;
                }
                if (!Set.of("enheter", "avdelinger", "rammeområde").contains(type))
                    throw new IllegalArgumentException("Organisation chart has an unknown or missing unit type");
                if (current.parentId() == null) break;
                current = byId.get(current.parentId());
                if (current == null) throw new IllegalArgumentException("Organisation chart has an unknown parent");
                depth++;
            }
            if (excluded) continue;
            ListName list = depth == 0 ? ListName.DEPARTMENT : depth == 1 ? ListName.SEKSJON : ListName.SUB_DEPARTMENT;
            result.add(Codelist.builder().list(list).code(unit.id()).shortName(unit.name())
                    .description("Hentes automatisk fra eADM.").source("EADM")
                    .parentCode(unit.parentId()).build());
        }
        if (result.stream().noneMatch(c -> c.getList() == ListName.DEPARTMENT))
            throw new IllegalArgumentException("Organisation chart has no organisational roots");
        return result;
    }

    public static void addMetadata(List<Codelist> storedCodes, OrganisationChart chart) {
        if (chart.getUnits().isEmpty() || chart.getUnits().stream().anyMatch(u -> u.unitType() == null || u.unitType().isBlank())) return;
        var metadata = fromChart(chart).stream().collect(Collectors.toMap(c -> c.getList() + ":" + c.getCode(), Function.identity()));
        for (var code : storedCodes) {
            var source = metadata.get(code.getList() + ":" + code.getCode());
            if (source != null) {
                code.setSource(source.getSource());
                code.setParentCode(source.getParentCode());
            }
        }
    }
}
