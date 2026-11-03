package no.nav.data.polly.teams.entra;

import no.nav.data.polly.teams.ResourceService;
import no.nav.data.polly.teams.ResourceStub;
import no.nav.data.polly.teams.TeamService;
import no.nav.data.polly.teams.TeamStub;
import no.nav.data.polly.teams.teamcat.TeamcatResourceClient;
import no.nav.data.polly.teams.teamcat.TeamcatTeamClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class EntraProviderSelectionTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withBean(EntraGraphClient.class, () -> mock(EntraGraphClient.class))
            .withBean(EntraDirectoryProperties.class, EntraDirectoryProperties::new)
            .withUserConfiguration(EntraResourceService.class, EntraTeamService.class,
                    ResourceStub.class, TeamStub.class, TeamcatResourceClient.class, TeamcatTeamClient.class);

    @Test
    void entraOverridesNavAndOfflineProvidersWithoutDuplicateBeans() {
        context.withPropertyValues("client.entra-directory.enabled=true", "client.teamcat-resource.enabled=true",
                "client.teamcat-team.enabled=true").run(ctx -> {
            assertThat(ctx).hasSingleBean(ResourceService.class).hasSingleBean(TeamService.class);
            assertThat(ctx.getBean(ResourceService.class)).isInstanceOf(EntraResourceService.class);
            assertThat(ctx.getBean(TeamService.class)).isInstanceOf(EntraTeamService.class);
        });
    }

    @Test
    void disabledDirectoryRetainsOfflineProviders() {
        context.withPropertyValues("client.entra-directory.enabled=false").run(ctx -> {
            assertThat(ctx).hasSingleBean(ResourceService.class).hasSingleBean(TeamService.class);
            assertThat(ctx.getBean(ResourceService.class)).isInstanceOf(ResourceStub.class);
            assertThat(ctx.getBean(TeamService.class)).isInstanceOf(TeamStub.class);
        });
    }
    @Test
    void composeEnvironmentBindsSelectedGroupAndEnableFlag() {
        String id = "526beb77-dc8d-4b5a-a7f7-7b6f504fd71b";
        new ApplicationContextRunner().withUserConfiguration(BindingConfig.class)
                .withInitializer(ctx -> ctx.getEnvironment().getPropertySources().addFirst(
                        new SystemEnvironmentPropertySource("directory-env", Map.of(
                                "CLIENT_ENTRA_DIRECTORY_ENABLED", "true",
                                "CLIENT_ENTRA_DIRECTORY_GROUP_IDS", id))))
                .run(ctx -> {
                    var properties = ctx.getBean(EntraDirectoryProperties.class);
                    assertThat(properties.isEnabled()).isTrue();
                    assertThat(properties.getGroupIds()).containsExactly(UUID.fromString(id));
                });
    }

    @Configuration
    @EnableConfigurationProperties(EntraDirectoryProperties.class)
    static class BindingConfig {}

}
