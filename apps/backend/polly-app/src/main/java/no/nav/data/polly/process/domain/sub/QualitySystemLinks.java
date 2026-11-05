package no.nav.data.polly.process.domain.sub;

import lombok.Data;
import no.nav.data.common.validator.FieldValidator;
import no.nav.data.common.validator.Validated;
import java.io.Serializable;
import java.net.URI;

@Data
public class QualitySystemLinks implements Serializable, Validated {
    private static final long serialVersionUID = 1L;
    private java.util.List<Document> documents = new java.util.ArrayList<>();
    private String dataProcessingAgreement;
    private String dpia;
    private String initialDpia;
    private String ros;
    private String mainAgreement;
    private String otherAgreement;

    @Override
    public void format() {
        dataProcessingAgreement = dataProcessingAgreement == null || dataProcessingAgreement.isBlank() ? null : dataProcessingAgreement.trim();
        dpia = dpia == null || dpia.isBlank() ? null : dpia.trim();
        initialDpia = initialDpia == null || initialDpia.isBlank() ? null : initialDpia.trim();
        ros = ros == null || ros.isBlank() ? null : ros.trim();
        mainAgreement = mainAgreement == null || mainAgreement.isBlank() ? null : mainAgreement.trim();
        otherAgreement = otherAgreement == null || otherAgreement.isBlank() ? null : otherAgreement.trim();
    }

    @Override
    public void validate(FieldValidator validator) {
        if (documents != null) {
            for (int i = 0; i < documents.size(); i++) {
                if (documents.get(i) == null) {
                    validator.addError("documents[" + i + "]", null, "fieldIsNullOrMissing", "Document is required");
                } else {
                    validator.validateType("documents[" + i + "]", documents.get(i));
                }
            }
        }
        validateUrl(validator, "dataProcessingAgreement", dataProcessingAgreement);
        validateUrl(validator, "dpia", dpia);
        validateUrl(validator, "initialDpia", initialDpia);
        validateUrl(validator, "ros", ros);
        validateUrl(validator, "mainAgreement", mainAgreement);
        validateUrl(validator, "otherAgreement", otherAgreement);
    }

    private static void validateUrl(FieldValidator validator, String field, String value) {
        if (value == null || value.isBlank()) return;
        try {
            URI uri = URI.create(value);
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) && uri.getHost() != null) return;
        } catch (IllegalArgumentException ignored) {
        }
        validator.addError(field, value, "fieldWrongFormat", "Use a valid HTTP or HTTPS URL");
    }
    @Data
    public static class Document implements Serializable, Validated {
        private static final long serialVersionUID = 1L;
        private String type;
        private String name;
        private String url;

        @Override
        public void format() {
            type = type == null ? null : type.trim();
            name = name == null ? null : name.trim();
            url = url == null ? null : url.trim();
        }

        @Override
        public void validate(FieldValidator validator) {
            validator.checkRequiredCodelist("type", type,
                    no.nav.data.polly.codelist.domain.ListName.INFORMASJONSIKKERHET_CATEGORY);
            validator.checkBlank("name", name);
            validator.checkBlank("url", url);
            validateUrl(validator, "url", url);
        }
    }
}
