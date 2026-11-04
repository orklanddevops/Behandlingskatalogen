package no.nav.data.polly.process;

import no.nav.data.common.validator.FieldValidator;
import no.nav.data.polly.process.domain.sub.Retention;
import no.nav.data.polly.process.dto.sub.RetentionRequest;
import no.nav.data.polly.process.dpprocess.domain.sub.DpRetention;
import no.nav.data.polly.process.dpprocess.dto.sub.DpRetentionRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RetentionTest {

    @Test
    void preservesMonthsAndDaysInTreatment() {
        var request = RetentionRequest.builder().retentionMonths(14).retentionDays(9).build();
        var response = Retention.convertRetention(request).convertToResponse();
        assertThat(response.getRetentionMonths()).isEqualTo(14);
        assertThat(response.getRetentionDays()).isEqualTo(9);
    }

    @Test
    void preservesDaysOnlyInDataProcessorTreatment() {
        var response = DpRetention.convertRetention(DpRetentionRequest.builder().retentionDays(7).build()).convertToResponse();
        assertThat(response.getRetentionMonths()).isNull();
        assertThat(response.getRetentionDays()).isEqualTo(7);
    }

    @Test
    void supportsExistingRecordsWithoutDays() {
        var response = Retention.convertRetention(RetentionRequest.builder().retentionMonths(24).build()).convertToResponse();
        assertThat(response.getRetentionMonths()).isEqualTo(24);
        assertThat(response.getRetentionDays()).isNull();
    }

    @Test
    void rejectsNegativeDays() {
        var validator = new FieldValidator("retention");
        RetentionRequest.builder().retentionDays(-1).build().validate(validator);
        assertThat(validator.getErrors()).hasSize(1);

        var dpValidator = new FieldValidator("retention");
        DpRetentionRequest.builder().retentionDays(-1).build().validate(dpValidator);
        assertThat(dpValidator.getErrors()).hasSize(1);
    }
}
