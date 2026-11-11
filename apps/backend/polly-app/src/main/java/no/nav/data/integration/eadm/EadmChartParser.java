package no.nav.data.integration.eadm;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Component
public class EadmChartParser {
    public OrganisationChart parse(JsonNode response, String organizationNumber, int minimumDepartments,
                                   int previousCount) {
        if (response == null || !"0".equals(text(response, "returncode")) || !text(response, "lasterror").isEmpty()) {
            throw new IllegalArgumentException("eADM rejected the export");
        }
        var rows = response.path("data");
        if (!rows.isArray() || rows.size() < Math.max(1, minimumDepartments) || rows.size() > 10_000) {
            throw new IllegalArgumentException("eADM returned an incomplete organisation chart");
        }
        if (previousCount > 0 && rows.size() < previousCount * 0.75) {
            throw new IllegalArgumentException("eADM organisation chart lost more than 25 percent of its departments");
        }
        Map<String, OrganisationUnit> units = new LinkedHashMap<>();
        for (var row : rows) {
            Map<String, String> fields = new HashMap<>();
            if (!row.path("syncfields").isArray()) throw new IllegalArgumentException("Missing eADM syncfields");
            for (var field : row.path("syncfields")) {
                String key = text(field, "name");
                if (fields.putIfAbsent(key, text(field, "value")) != null) {
                    throw new IllegalArgumentException("Duplicate eADM syncfield");
                }
            }
            String id = fields.getOrDefault("DepartmentNumber", "");
            if (id.isEmpty()) id = fields.getOrDefault("SourceId", "");
            String name = fields.getOrDefault("Department", "");
            String parent = fields.getOrDefault("ParentDepartmentNumber", "");
            if (id.isEmpty() || name.isEmpty()) throw new IllegalArgumentException("Missing eADM department ID or name");
            var unit = new OrganisationUnit(id, parent.isEmpty() || parent.equals("0") ? null : parent,
                    name, text(row, "managername"));
            if (units.putIfAbsent(id, unit) != null) throw new IllegalArgumentException("Duplicate eADM department ID");
        }

        // Validate every parent chain before replacing the last successful snapshot.
        for (var unit : units.values()) {
            Set<String> path = new HashSet<>();
            var current = unit;
            while (current != null) {
                if (!path.add(current.id())) throw new IllegalArgumentException("Cycle in eADM organisation chart");
                if (path.size() > 100) throw new IllegalArgumentException("eADM hierarchy is too deep");
                if (current.parentId() == null) break;
                current = units.get(current.parentId());
                if (current == null) throw new IllegalArgumentException("Unknown parent in eADM organisation chart");
            }
        }
        var chart = new OrganisationChart();
        chart.setOrganizationNumber(organizationNumber);
        chart.setQueryId(text(response, "queryid"));
        chart.setUnits(List.copyOf(units.values()));
        chart.setRetrievedAt(Instant.now());
        chart.setLastAttemptAt(chart.getRetrievedAt());
        return chart;
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("").trim();
    }
}
