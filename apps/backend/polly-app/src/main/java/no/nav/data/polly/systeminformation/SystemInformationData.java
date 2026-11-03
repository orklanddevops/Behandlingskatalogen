package no.nav.data.polly.systeminformation;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

public record SystemInformationData(
        Contact systemOwner, List<Contact> administrators, List<Contact> superUsers,
        TeamReference responsibleTeam, String organisationalUnit, String supportEmail,
        String supportUrl, String notes, LocalDate lastVerifiedDate, String lastVerifiedBy,
        String supportPhone, String emergencyEmail, String emergencyUrl, String emergencyPhone) implements Serializable {
    public record Contact(String id, String name, String email) implements Serializable {}
    public record TeamReference(String id, String name) implements Serializable {}

    public SystemInformationData(Contact systemOwner, List<Contact> administrators, List<Contact> superUsers,
            TeamReference responsibleTeam, String organisationalUnit, String supportEmail, String supportUrl,
            String notes, LocalDate lastVerifiedDate, String lastVerifiedBy) {
        this(systemOwner, administrators, superUsers, responsibleTeam, organisationalUnit, supportEmail,
                supportUrl, notes, lastVerifiedDate, lastVerifiedBy, "", "", "", "");
    }

    public static SystemInformationData empty() {
        return new SystemInformationData(null, List.of(), List.of(), null, "", "", "", "", null, null);
    }
}
