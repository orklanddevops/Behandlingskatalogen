package no.nav.data.polly.process.dpprocess.dto.sub;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonPropertyOrder({"retentionMonths", "retentionDays", "retentionStart"})
public class DpRetentionResponse {

    private Integer retentionMonths;
    private Integer retentionDays;
    private String retentionStart;
}
