package no.nav.data.integration.eadm;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import no.nav.data.common.security.SecurityProperties;
import no.nav.data.common.security.WebSecurityConfig;
import no.nav.data.common.security.azure.AADStatelessAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

class OrganisationChartSecurityTest {
    @Test
    void storedChartsRequireSignInAndOnlyAdminsCanTriggerEadm() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(TestConfig.class);
            context.refresh();
            var mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(context.getBean(FilterChainProxy.class)).build();
            assertThat(mvc.perform(get("/organisation")).andReturn().getResponse().getStatus()).isIn(401, 403);
            for (String role : new String[]{"READ", "WRITE", "SUPER", "ADMIN"}) {
                assertThat(mvc.perform(get("/organisation").header("Test-Role", role)).andReturn().getResponse().getStatus()).isEqualTo(200);
                assertThat(mvc.perform(post("/organisation/refresh").header("Test-Role", role)).andReturn().getResponse().getStatus())
                        .isEqualTo(role.equals("ADMIN") ? 200 : 403);
            }
        }
    }

    @org.springframework.web.bind.annotation.RestController
    static class Probe {
        @org.springframework.web.bind.annotation.GetMapping("/organisation")
        String read() { return "stored"; }
        @org.springframework.web.bind.annotation.PostMapping("/organisation/refresh")
        String refresh() { return "refreshed"; }
    }

    @Configuration
    @EnableWebSecurity
    @EnableWebMvc
    static class TestConfig extends WebSecurityConfig {
        TestConfig() throws Exception { super(authenticationFilter(), securityProperties()); }
        private static SecurityProperties securityProperties() {
            var properties = new SecurityProperties();
            properties.setEnabled(true);
            return properties;
        }
        private static AADStatelessAuthenticationFilter authenticationFilter() throws Exception {
            var filter = mock(AADStatelessAuthenticationFilter.class);
            doAnswer(invocation -> {
                HttpServletRequest request = invocation.getArgument(0);
                String role = request.getHeader("Test-Role");
                if (role != null) SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken("employee", "", AuthorityUtils.createAuthorityList("ROLE_" + role)));
                try { ((FilterChain) invocation.getArgument(2)).doFilter(invocation.getArgument(0), invocation.getArgument(1)); }
                finally { SecurityContextHolder.clearContext(); }
                return null;
            }).when(filter).doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
            return filter;
        }
        @Bean Probe probe() { return new Probe(); }
    }
}
