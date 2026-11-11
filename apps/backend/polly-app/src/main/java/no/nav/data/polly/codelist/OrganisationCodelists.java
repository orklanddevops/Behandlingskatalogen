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
            ListName list;
            if ("Enheter".equalsIgnoreCase(unit.unitType())) {
                list = ListName.DEPARTMENT;
            } else if ("Avdelinger".equalsIgnoreCase(unit.unitType())) {
                var parent = byId.get(unit.parentId());
                if (parent == null || !Set.of("Enheter", "Avdelinger").contains(parent.unitType()))
                    throw new IllegalArgumentException("Department has no typed organisational parent");
                list = "Enheter".equalsIgnoreCase(parent.unitType()) ? ListName.SEKSJON : ListName.SUB_DEPARTMENT;
            } else if ("Rammeområde".equalsIgnoreCase(unit.unitType()) || "Personer uten arbeidsforhold".equalsIgnoreCase(unit.unitType())) {
                // These groups remain in the chart, not in the organisation categories.
                continue;
            } else {
                throw new IllegalArgumentException("Organisation chart has an unknown or missing unit type");
            }
            var code = Codelist.builder().list(list).code(unit.id()).shortName(unit.name())
                    .description("Hentes automatisk fra eADM.").source("EADM")
                    .parentCode(list == ListName.DEPARTMENT ? null : unit.parentId()).build();
            result.add(code);
        }
        if (result.stream().noneMatch(c -> c.getList() == ListName.DEPARTMENT)) {
            throw new IllegalArgumentException("Organisation chart has no typed units");
        }
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
