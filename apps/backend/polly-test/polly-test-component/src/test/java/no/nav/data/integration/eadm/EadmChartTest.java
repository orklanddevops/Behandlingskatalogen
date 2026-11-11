package no.nav.data.integration.eadm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import no.nav.data.common.utils.JsonUtils;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class EadmChartTest {
    private final EadmChartParser parser = new EadmChartParser();

    private ObjectNode unit(String id, String parent, String name) {
        var row = JsonUtils.getObjectMapper().createObjectNode();
        row.put("managername", "Test Manager");
        var fields = row.putArray("syncfields");
        for (var field : List.of(new String[]{"DepartmentNumber", id}, new String[]{"ParentDepartmentNumber", parent},
                new String[]{"Department", name}, new String[]{"TelephoneNumber", "must-not-be-stored"})) {
            fields.addObject().put("name", field[0]).put("value", field[1]);
        }
        return row;
    }

    private ObjectNode response(JsonNode... units) {
        var root = JsonUtils.getObjectMapper().createObjectNode();
        root.put("returncode", "0").put("lasterror", "").put("queryid", "query");
        var data = root.putArray("data");
        for (var unit : units) data.add(unit);
        return root;
    }

    @Test
    void mapsStableIdsParentsAndManagerNamesWithoutStoringTheRawExport() {
        var chart = parser.parse(response(unit("10", "0", "Root"), unit("20", "10", "Child")), "NO123", 1, 0);
        assertThat(chart.getUnits()).containsExactly(
                new OrganisationUnit("10", null, "Root", "Test Manager"),
                new OrganisationUnit("20", "10", "Child", "Test Manager"));
        assertThat(chart.getRetrievedAt()).isNotNull();
        assertThat(chart.getLastAttemptAt()).isEqualTo(chart.getRetrievedAt());
        assertThat(chart.getOrganizationNumber()).isEqualTo("NO123");
        assertThat(JsonUtils.toJson(chart)).doesNotContain("must-not-be-stored", "changeStamp");
        var restored = JsonUtils.toObject(JsonUtils.toJson(chart), OrganisationChart.class);
        assertThat(restored.getUnits()).isEqualTo(chart.getUnits());
        assertThat(restored.getRetrievedAt()).isEqualTo(chart.getRetrievedAt());
    }

    @Test
    void sourceIdFallbackAndDuplicateNamesAreSupported() {
        var child = unit("", "10", "Same name");
        child.withArray("syncfields").addObject().put("name", "SourceId").put("value", "20");
        var chart = parser.parse(response(unit("10", "0", "Same name"), child), "NO123", 1, 0);
        assertThat(chart.getUnits()).extracting(OrganisationUnit::id).containsExactly("10", "20");
    }

    @Test
    void rejectsMissingDuplicateOrCyclicIdsAndUnknownParents() {
        assertThatThrownBy(() -> parser.parse(response(unit("", "0", "A")), "NO123", 1, 0)).hasMessageContaining("ID");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "0", "")), "NO123", 1, 0)).hasMessageContaining("name");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "0", "A"), unit("1", "0", "B")), "NO123", 1, 0)).hasMessageContaining("Duplicate");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "2", "A"), unit("2", "1", "B")), "NO123", 1, 0)).hasMessageContaining("Cycle");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "99", "A")), "NO123", 1, 0)).hasMessageContaining("Unknown parent");
    }

    @Test
    void rejectsApiErrorsEmptySmallAndUnexpectedlyReducedCharts() {
        var error = response(unit("1", "0", "A"));
        error.put("returncode", "2");
        assertThatThrownBy(() -> parser.parse(error, "NO123", 1, 0)).hasMessageContaining("rejected");
        error.put("returncode", 0).put("lasterror", "audit");
        assertThatThrownBy(() -> parser.parse(error, "NO123", 1, 0)).hasMessageContaining("rejected");
        assertThatThrownBy(() -> parser.parse(response(), "NO123", 1, 0)).hasMessageContaining("incomplete");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "0", "A")), "NO123", 50, 0)).hasMessageContaining("incomplete");
        assertThatThrownBy(() -> parser.parse(response(unit("1", "0", "A")), "NO123", 1, 10)).hasMessageContaining("25 percent");
    }
}
