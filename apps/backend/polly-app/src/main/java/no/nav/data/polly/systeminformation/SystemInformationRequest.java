package no.nav.data.polly.systeminformation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import no.nav.data.polly.systeminformation.SystemInformationData.SystemDocument;

public record SystemInformationRequest(
        @PositiveOrZero Long version,
        @Size(max = 100) String systemOwnerId,
        @Size(max = 50) List<@Size(max = 100) String> administratorIds,
        @Size(max = 100) List<@Size(max = 100) String> superUserIds,
        @Size(max = 250) String organisationalUnit,
        @Email @Size(max = 254) String supportEmail,
        @Size(max = 2000) String supportUrl,
        @Size(max = 10000) String notes,
        boolean markVerified,
        @Size(max = 50) String supportPhone,
        @Email @Size(max = 254) String emergencyEmail,
        @Size(max = 2000) String emergencyUrl,
        @Size(max = 50) String emergencyPhone,
        @Size(max = 100) String itResponsibleId,
        @jakarta.validation.Valid TechnicalRequest technical,
        @jakarta.validation.Valid SystemInformationData.Economy economy,
        @jakarta.validation.Valid SystemInformationData.Accessibility accessibility,
        @Size(max = 100) List<@jakarta.validation.constraints.NotNull UUID> supplierIds,
        @Size(max = 500) List<@jakarta.validation.constraints.NotNull @jakarta.validation.Valid SystemDocument> documents) {
    public SystemInformationRequest(Long version, String systemOwnerId, List<String> administratorIds,
            List<String> superUserIds, String organisationalUnit, String supportEmail, String supportUrl,
            String notes, boolean markVerified, String supportPhone, String emergencyEmail,
            String emergencyUrl, String emergencyPhone, String itResponsibleId, TechnicalRequest technical,
            SystemInformationData.Economy economy, SystemInformationData.Accessibility accessibility) {
        this(version, systemOwnerId, administratorIds, superUserIds, organisationalUnit, supportEmail,
                supportUrl, notes, markVerified, supportPhone, emergencyEmail, emergencyUrl, emergencyPhone,
                itResponsibleId, technical, economy, accessibility, null, null);
    }

    public record TechnicalRequest(@Size(max = 100) String technicalOperatorId,
            @PositiveOrZero Integer userCount,
            @jakarta.validation.constraints.Pattern(regexp = "|LOW|MEDIUM|HIGH|CRITICAL") String criticality) {}

    public SystemInformationRequest(Long version, String systemOwnerId, List<String> administratorIds,
            List<String> superUserIds, String organisationalUnit, String supportEmail, String supportUrl,
            String notes, boolean markVerified, String supportPhone, String emergencyEmail,
            String emergencyUrl, String emergencyPhone) {
        this(version, systemOwnerId, administratorIds, superUserIds, organisationalUnit, supportEmail,
                supportUrl, notes, markVerified, supportPhone, emergencyEmail, emergencyUrl, emergencyPhone,
                null, null, null, null);
    }
}
