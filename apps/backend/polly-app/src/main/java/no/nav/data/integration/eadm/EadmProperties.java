package no.nav.data.integration.eadm;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "client.eadm")
public class EadmProperties {
    private boolean enabled = false;
    private String url = "https://api.eadm.no/service.asmx/getorganizationchart";
    private String organizationNumber = "NO921233418";
    private int minimumDepartments = 50;
}
