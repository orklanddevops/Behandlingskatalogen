package no.nav.data.polly.codelist;

import no.nav.data.polly.codelist.domain.Codelist;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.process.domain.sub.Affiliation;
import no.nav.data.polly.process.domain.sub.nomSeksjon;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class OrganisationAffiliations {
    private OrganisationAffiliations() {}

    public static List<Codelist> branch(List<Codelist> codes, String id) {
        var byId = codes.stream().collect(Collectors.toMap(Codelist::getCode, Function.identity()));
        List<Codelist> branch = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        var current = byId.get(id);
        while (current != null) {
            if (!visited.add(current.getCode())) throw new IllegalArgumentException("Cyclic organisation hierarchy");
            branch.add(current);
            current = current.getParentCode() == null ? null : byId.get(current.getParentCode());
        }
        return branch;
    }

    public static void reclassify(Affiliation affiliation, String id, List<Codelist> codes) {
        var branch = branch(codes, id);
        var root = branch.stream().filter(c -> c.getList() == ListName.DEPARTMENT).findFirst().orElseThrow();
        // Remove the moved ID from its previous category, retaining unrelated selections.
        var sections = new ArrayList<>(affiliation.getSeksjoner() == null ? List.<nomSeksjon>of() : affiliation.getSeksjoner());
        sections.removeIf(section -> id.equals(section.getNomSeksjonId()));
        var children = new ArrayList<>(affiliation.getSubDepartments() == null ? List.<String>of() : affiliation.getSubDepartments());
        children.removeIf(id::equals);
        for (var code : branch) {
            if (code.getList() == ListName.SEKSJON && sections.stream().noneMatch(s -> s.getNomSeksjonId().equals(code.getCode())))
                sections.add(new nomSeksjon(code.getCode(), code.getShortName()));
            if (code.getList() == ListName.SUB_DEPARTMENT && !children.contains(code.getCode()))
                children.add(code.getCode());
        }
        affiliation.setNomDepartmentId(root.getCode());
        affiliation.setNomDepartmentName(root.getShortName());
        affiliation.setSeksjoner(sections);
        affiliation.setSubDepartments(children);
    }
}
