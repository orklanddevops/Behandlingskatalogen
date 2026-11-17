package no.nav.data.polly.systeminformation;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

public record SystemInformationData(
        Contact systemOwner, List<Contact> administrators, List<Contact> superUsers,
        TeamReference responsibleTeam, String organisationalUnit, String supportEmail,
        String supportUrl, String notes, LocalDate lastVerifiedDate, String lastVerifiedBy,
        String supportPhone, String emergencyEmail, String emergencyUrl, String emergencyPhone, Contact itResponsible, Technical technical, Economy economy, Accessibility accessibility) implements Serializable {
    public record Technical(Contact technicalOperator, Integer userCount, String criticality) implements Serializable {}
    public record Economy(
            @jakarta.validation.constraints.PositiveOrZero @jakarta.validation.constraints.Digits(integer = 12, fraction = 2) java.math.BigDecimal annualCost,
            @jakarta.validation.constraints.PositiveOrZero @jakarta.validation.constraints.Digits(integer = 12, fraction = 2) java.math.BigDecimal purchaseCost,
            @jakarta.validation.constraints.Size(max = 2000) String agreementUrl,
            LocalDate purchaseDate, @jakarta.validation.constraints.Size(max = 10000) String terminationTerms) implements Serializable {}
    public record Accessibility(
            @jakarta.validation.constraints.Pattern(regexp = "RELEVANT|NOT_RELEVANT|UNSET") String relevance,
            @jakarta.validation.constraints.Pattern(regexp = "web|app|UNSET") String solutionType,
            @jakarta.validation.constraints.Size(max = 60) java.util.Map<String, String> webAnswers,
            @jakarta.validation.constraints.Size(max = 60) java.util.Map<String, String> appAnswers) implements Serializable {}

    public SystemInformationData(Contact systemOwner, List<Contact> administrators, List<Contact> superUsers,
            TeamReference responsibleTeam, String organisationalUnit, String supportEmail, String supportUrl,
            String notes, LocalDate lastVerifiedDate, String lastVerifiedBy, String supportPhone,
            String emergencyEmail, String emergencyUrl, String emergencyPhone) {
        this(systemOwner, administrators, superUsers, responsibleTeam, organisationalUnit, supportEmail,
                supportUrl, notes, lastVerifiedDate, lastVerifiedBy, supportPhone, emergencyEmail,
                emergencyUrl, emergencyPhone, null, null, null, null);
    }

    public record Contact(String id, String name, String email) implements Serializable {}
    public record TeamReference(String id, String name) implements Serializable {}

    public SystemInformationData(Contact systemOwner, List<Contact> administrators, List<Contact> superUsers,
            TeamReference responsibleTeam, String organisationalUnit, String supportEmail, String supportUrl,
            String notes, LocalDate lastVerifiedDate, String lastVerifiedBy) {
        this(systemOwner, administrators, superUsers, responsibleTeam, organisationalUnit, supportEmail,
                supportUrl, notes, lastVerifiedDate, lastVerifiedBy, "", "", "", "");
    }

    public SystemInformationData withOrganisationalUnit(String unit) {
        return new SystemInformationData(systemOwner, administrators, superUsers, responsibleTeam, unit,
                supportEmail, supportUrl, notes, lastVerifiedDate, lastVerifiedBy,
                supportPhone, emergencyEmail, emergencyUrl, emergencyPhone, itResponsible, technical, economy, accessibility);
    }

    public static SystemInformationData empty() {
        return new SystemInformationData(null, List.of(), List.of(), null, "", "", "", "", null, null);
    }
}
