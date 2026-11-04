package no.nav.data.polly.process.dto.sub;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonPropertyOrder({"retentionPlan", "retentionMonths", "retentionDays", "retentionStart", "retentionDescription"})
public class RetentionResponse {

    private Boolean retentionPlan;
    private Integer retentionMonths;
    private Integer retentionDays;
    private String retentionStart;
    private String retentionDescription;
}
