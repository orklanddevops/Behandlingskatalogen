package no.nav.data.common.rest;

import no.nav.data.common.utils.JsonUtils;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ChangeStampResponseTest {
    @Test
    void legacyNullPrefixIsRemovedFromTheSerializedLabel() {
        var response = ChangeStampResponse.builder().lastModifiedBy("null - Jan Ove Rønning").build();
        var json = JsonUtils.toJsonNode(JsonUtils.toJson(response));
        assertThat(json.get("lastModifiedBy").asText()).isEqualTo("Jan Ove Rønning");
    }

    @Test
    void namesAndValidIdentifiersArePreserved() {
        for (String author : new String[]{"Jan Ove Rønning", "A123456 - Test Person", "Null Hansen"}) {
            assertThat(ChangeStampResponse.builder().lastModifiedBy(author).build().getLastModifiedBy()).isEqualTo(author);
        }
        assertThat(new ChangeStampResponse().getLastModifiedBy()).isNull();
    }
}
