package no.nav.data.polly.systeminformation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SystemInformationRepository extends JpaRepository<SystemInformation, UUID> {}
