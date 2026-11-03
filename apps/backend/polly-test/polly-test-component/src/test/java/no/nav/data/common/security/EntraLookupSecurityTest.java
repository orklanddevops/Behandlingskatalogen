package no.nav.data.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

class EntraLookupSecurityTest {
    @Test
    void enabledDirectoryBlocksAnonymousLookupEvenIfLocalSecurityIsDisabled() throws Exception {
        try (var context = createContext(true)) {
            var mvc = MockMvcBuilders.webAppContextSetup(context)
                    .addFilters(context.getBean(FilterChainProxy.class)).build();
            for (String path : new String[]{"/team", "/team/search/example", "/team/resource/search/example", "/team/example"}) {
                assertThat(mvc.perform(get(path)).andReturn().getResponse().getStatus()).isIn(401, 403);
            }
            assertThat(mvc.perform(get("/codelist/example")).andReturn().getResponse().getStatus()).isEqualTo(200);
        }
    }

    @Test
    void offlineLookupRetainsPreviousAnonymousReadBehavior() throws Exception {
        try (var context = createContext(false)) {
            var mvc = MockMvcBuilders.webAppContextSetup(context)
                    .addFilters(context.getBean(FilterChainProxy.class)).build();
            assertThat(mvc.perform(get("/team/resource/search/example")).andReturn().getResponse().getStatus()).isEqualTo(200);
        }
    }

    private AnnotationConfigWebApplicationContext createContext(boolean enabled) {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        TestPropertySourceUtils.addInlinedPropertiesToEnvironment(context, "client.entra-directory.enabled=" + enabled);
        context.register(TestConfig.class);
        context.refresh();
        return context;
    }

    @Configuration
    @EnableWebSecurity
    @EnableWebMvc
    static class TestConfig extends WebSecurityConfig {
        TestConfig() { super(null, localSecurity()); }

        private static SecurityProperties localSecurity() {
            var properties = new SecurityProperties();
            properties.setEnabled(false);
            return properties;
        }
        @Bean LookupController lookupController() { return new LookupController(); }
    }

    @RestController
    static class LookupController {
        @GetMapping({"/team", "/team/search/{name}", "/team/resource/search/{name}", "/team/{id}", "/codelist/{id}"})
        String lookup() { return "ok"; }
    }
}
