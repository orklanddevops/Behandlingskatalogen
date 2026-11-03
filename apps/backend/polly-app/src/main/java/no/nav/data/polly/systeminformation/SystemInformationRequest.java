package no.nav.data.polly.systeminformation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SystemInformationRequest(
        @PositiveOrZero Long version,
        @Size(max = 100) String systemOwnerId,
        @Size(max = 50) List<@Size(max = 100) String> administratorIds,
        @Size(max = 100) List<@Size(max = 100) String> superUserIds,
        @Size(max = 100) String responsibleTeamId,
        @Size(max = 250) String organisationalUnit,
        @Email @Size(max = 254) String supportEmail,
        @Size(max = 2000) String supportUrl,
        @Size(max = 10000) String notes,
        boolean markVerified) {}
