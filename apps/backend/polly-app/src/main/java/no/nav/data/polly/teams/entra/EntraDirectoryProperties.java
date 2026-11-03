package no.nav.data.polly.teams.entra;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Data
@ConfigurationProperties("client.entra-directory")
public class EntraDirectoryProperties {
    private boolean enabled;
    // Explicitly selected groups; never enumerate the tenant's security groups as teams.
    private Set<UUID> groupIds = new LinkedHashSet<>();
}
