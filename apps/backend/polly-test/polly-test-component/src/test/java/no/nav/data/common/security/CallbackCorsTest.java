package no.nav.data.common.security;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class CallbackCorsTest {
 static class Registry extends CorsRegistry {
  Map<String, CorsConfiguration> mappings() { return getCorsConfigurations(); }
 }
 @RestController static class Callback {
  @PostMapping("/oauth2/callback") String callback() { return "ok"; }
 }
 @Test void microsoftFormPostAndPreflightAllowedButUntrustedOriginsRejected() throws Exception {
  var props = new SecurityProperties();
  props.setRedirectUris(List.of("https://digikatalogen.orkland.kommune.no/"));
  var registry = new Registry();
  new SecurityConfig().corsConfigurer(props).addCorsMappings(registry);
  var source = new UrlBasedCorsConfigurationSource();
  source.setCorsConfigurations(registry.mappings());
  var mvc = MockMvcBuilders.standaloneSetup(new Callback()).addFilters(new CorsFilter(source)).build();
  mvc.perform(post("/oauth2/callback").header("Origin", "https://login.microsoftonline.com")
   .contentType("application/x-www-form-urlencoded").content("code=fixture&state=fixture"))
   .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "https://login.microsoftonline.com"));
  mvc.perform(options("/oauth2/callback").header("Origin", "https://login.microsoftonline.com")
   .header("Access-Control-Request-Method", "POST")).andExpect(status().isOk());
  mvc.perform(post("/oauth2/callback").header("Origin", "https://digikatalogen.orkland.kommune.no"))
   .andExpect(status().isOk());
  mvc.perform(post("/oauth2/callback").header("Origin", "https://untrusted.example"))
   .andExpect(status().isForbidden());
 }
}
