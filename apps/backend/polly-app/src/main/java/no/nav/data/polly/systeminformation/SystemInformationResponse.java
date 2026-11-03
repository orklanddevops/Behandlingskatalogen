package no.nav.data.polly.systeminformation;

import java.time.LocalDateTime;

public record SystemInformationResponse(String systemCode, Long version, SystemInformationData data,
                                        LocalDateTime updatedAt, String updatedBy) {}
