package no.nav.data.polly.codelist.domain;

public enum ListName {
    PURPOSE,
    INFORMASJONSIKKERHET_CATEGORY,
    CATEGORY,
    THIRD_PARTY,
    NATIONAL_LAW,
    SENSITIVITY,
    SUBJECT_CATEGORY,
    GDPR_ARTICLE,
    DEPARTMENT,
    SEKSJON,
    SUB_DEPARTMENT,
    TEAM,
    SYSTEM,
    TRANSFER_GROUNDS_OUTSIDE_EU,
    DATA_ACCESS_CLASS;

    public boolean isOrganisation() {
        return this == DEPARTMENT || this == SEKSJON || this == SUB_DEPARTMENT;
    }
}
