package no.nav.data.integration.nom;
import no.nav.data.common.security.SecurityProperties;
import no.nav.data.common.security.TokenProvider;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
class NomGraphClientOfflineTest {
 @Test void disabledIntegrationNeedsNeitherNavNetworkNorTokens() {
  var props = new NomGraphQlProperties();
  assertThat(props.isEnabled()).isTrue();
  props.setEnabled(false);
  props.setUrl("https://must-not-be-called.invalid/graphql");
  var security = new SecurityProperties(); security.setEnv("prod-gcp");
  var tokens = mock(TokenProvider.class);
  var client = new NomGraphClient(security, tokens, props);
  assertThat(client.getAllAvdelinger()).isEmpty();
  assertThat(client.getAvdelingById("old-id")).isEmpty();
  assertThat(client.getAllSeksjonForAvdeling("old-id")).isEmpty();
  assertThat(client.getAllFylker()).isEmpty();
  assertThat(client.searchNavkontorByTerm("search-term")).isEmpty();
  assertThat(client.getById("stored-id").getNavn()).isEqualTo("stored-id");
  verifyNoInteractions(tokens);
 }
}
