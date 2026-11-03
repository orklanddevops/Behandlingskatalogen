package no.nav.data.polly.systeminformation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SystemInformationRepository extends JpaRepository<SystemInformation, UUID> {
    @Query(value = "select * from SYSTEM_INFORMATION where DATA ->> 'organisationalUnit' = :code", nativeQuery = true)
    List<SystemInformation> findByOrganisationalUnit(@Param("code") String code);
}
