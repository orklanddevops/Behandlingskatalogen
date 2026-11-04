package no.nav.data.common.security.azure;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;

class AzureUserInfoTest {
    @Test
    void orklandUsersWithoutNavIdentUseTheirNameInAuditStamps() {
        var claims = new JWTClaimsSet.Builder().claim("ver", "2.0")
                .claim("oid", "0b1bb680-a1ce-4cde-bebe-38da2024c420")
                .claim("name", "Jan Ove Rønning").claim("preferred_username", "employee@orkland.kommune.no").build();
        var user = new AzureUserInfo(claims, Set.of());
        assertThat(user.getIdent()).isNull();
        assertThat(user.getIdentName()).isEqualTo("Jan Ove Rønning");
    }

    @Test
    void existingEmployeeIdentifiersArePreservedWhenPresent() {
        var claims = new JWTClaimsSet.Builder().claim("NAVident", "A123456").claim("name", "Test Person").build();
        assertThat(new AzureUserInfo(claims, Set.of()).getIdentName()).isEqualTo("A123456 - Test Person");
    }

    @Test
    void blankIdentifierAndMissingNamesNeverProduceLiteralNull() {
        var claims = new JWTClaimsSet.Builder().claim("ver", "2.0").claim("NAVident", " ")
                .claim("preferred_username", "employee@orkland.kommune.no").build();
        assertThat(new AzureUserInfo(claims, Set.of()).getIdentName()).isEqualTo("employee@orkland.kommune.no");
        assertThat(new AzureUserInfo(new JWTClaimsSet.Builder().build(), Set.of()).getIdentName()).isEqualTo("Ukjent bruker");
    }
}
