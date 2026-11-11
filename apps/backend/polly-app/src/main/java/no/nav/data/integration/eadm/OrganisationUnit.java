package no.nav.data.integration.eadm;

public record OrganisationUnit(String id, String parentId, String name, String managerName, String unitType) {
    public OrganisationUnit(String id, String parentId, String name, String managerName) {
        this(id, parentId, name, managerName, "");
    }
}
