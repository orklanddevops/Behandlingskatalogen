package no.nav.data.polly.systeminformation;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Data;
import lombok.EqualsAndHashCode;
import no.nav.data.common.auditing.domain.Auditable;
import org.hibernate.annotations.Type;

import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "SYSTEM_INFORMATION")
public class SystemInformation extends Auditable {
    @Id
    @Column(name = "ID")
    private UUID id;

    @Column(name = "SYSTEM_CODE", nullable = false, unique = true)
    private String systemCode;

    @Version
    @Column(name = "VERSION", nullable = false)
    private Long version;

    @Type(JsonBinaryType.class)
    @Column(name = "DATA", nullable = false)
    private SystemInformationData data;
}
