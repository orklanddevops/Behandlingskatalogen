package no.nav.data.common.security;

import java.net.URI;
import java.util.stream.Stream;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SecurityConfig {

    @Bean
    public Encryptor encryptor(SecurityProperties securityProperties) {
        return new Encryptor(securityProperties.getEncKey());
    }

    @Bean
    public WebMvcConfigurer corsConfigurer(SecurityProperties securityProperties) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                var applicationOrigins = securityProperties.getRedirectUris().stream()
                        .map(URI::create)
                        .map(uri -> uri.getScheme() + "://" + uri.getRawAuthority())
                        .distinct().toArray(String[]::new);
                var callbackOrigins = Stream.concat(Stream.of("https://login.microsoftonline.com"),
                        Stream.of(applicationOrigins)).distinct().toArray(String[]::new);
                registry.addMapping("/oauth2/callback")
                        .allowedOrigins(callbackOrigins)
                        .allowedMethods("POST", "OPTIONS")
                        .allowedHeaders("Content-Type")
                        .allowCredentials(true);
                registry.addMapping("/**")
                        .allowedOrigins(applicationOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .allowCredentials(true);

            }
        };
    }
}
