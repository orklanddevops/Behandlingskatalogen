package no.nav.data.polly.systeminformation;

import lombok.RequiredArgsConstructor;
import no.nav.data.common.exceptions.NotFoundException;
import no.nav.data.common.exceptions.ValidationException;
import no.nav.data.common.security.SecurityUtils;
import no.nav.data.common.security.dto.UserInfo;
import no.nav.data.common.utils.MdcUtils;
import no.nav.data.polly.codelist.CodelistRepository;
import no.nav.data.polly.codelist.domain.ListName;
import no.nav.data.polly.teams.ResourceService;
import no.nav.data.polly.teams.TeamService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static no.nav.data.polly.systeminformation.SystemInformationData.Contact;
import static no.nav.data.polly.systeminformation.SystemInformationData.TeamReference;

@Service
@RequiredArgsConstructor
public class SystemInformationService {
    private final SystemInformationRepository repository;
    private final CodelistRepository codelists;
    private final ResourceService employees;
    private final TeamService teams;

    @Transactional(readOnly = true)
    public SystemInformationResponse get(String code) {
        requireSystem(code);
        return repository.findById(idFor(code)).map(this::response)
                .orElseGet(() -> new SystemInformationResponse(code, null, SystemInformationData.empty(), null, null));
    }

    @Transactional
    public SystemInformationResponse save(String code, SystemInformationRequest request) {
        requireSystem(code);
        var stored = repository.findById(idFor(code));
        if (!Objects.equals(request.version(), stored.map(SystemInformation::getVersion).orElse(null))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Informasjonen er endret av en annen bruker. Last inn på nytt før du lagrer.");
        }
        String supportUrl = text(request.supportUrl());
        validateUrl(supportUrl);
        var old = stored.map(SystemInformation::getData).orElseGet(SystemInformationData::empty);
        var known = knownContacts(old);
        var owner = resolveContact(request.systemOwnerId(), known);
        var admins = resolveContacts(request.administratorIds(), known);
        var superUsers = resolveContacts(request.superUserIds(), known);
        var team = resolveTeam(request.responsibleTeamId(), old.responsibleTeam());
        var record = stored.orElseGet(() -> {
            var created = new SystemInformation();
            created.setId(idFor(code));
            created.setSystemCode(code);
            return created;
        });
        String reviewer = SecurityUtils.getCurrentUser().map(UserInfo::getName)
                .filter(name -> name != null && !name.isBlank()).orElseGet(MdcUtils::getUser);
        record.setData(new SystemInformationData(owner, admins, superUsers, team,
                text(request.organisationalUnit()), text(request.supportEmail()), supportUrl, text(request.notes()),
                request.markVerified() ? LocalDate.now(ZoneId.of("Europe/Oslo")) : old.lastVerifiedDate(),
                request.markVerified() ? reviewer : old.lastVerifiedBy()));
        return response(repository.saveAndFlush(record));
    }

    private void requireSystem(String code) {
        if (codelists.findByListAndCode(ListName.SYSTEM, code).isEmpty()) {
            throw new NotFoundException("Systemet finnes ikke.");
        }
    }

    private Map<String, Contact> knownContacts(SystemInformationData old) {
        var contacts = new LinkedHashMap<String, Contact>();
        if (old.systemOwner() != null) contacts.put(old.systemOwner().id(), old.systemOwner());
        old.administrators().forEach(contact -> contacts.put(contact.id(), contact));
        old.superUsers().forEach(contact -> contacts.put(contact.id(), contact));
        return contacts;
    }

    private Contact resolveContact(String rawId, Map<String, Contact> known) {
        String id = text(rawId);
        if (id.isBlank()) return null;
        // Retain saved contacts during a directory outage; only new selections require resolution.
        if (known.containsKey(id)) return known.get(id);
        var user = employees.getResource(id)
                .orElseThrow(() -> new ValidationException("Den valgte personen finnes ikke i ansattregisteret. Søk og velg på nytt."));
        var contact = new Contact(user.getNavIdent(), user.getFullName(), user.getEmail());
        known.put(contact.id(), contact);
        return contact;
    }

    private List<Contact> resolveContacts(List<String> ids, Map<String, Contact> known) {
        var contacts = new ArrayList<Contact>();
        if (ids != null) {
            ids.stream().map(id -> resolveContact(id, known)).filter(Objects::nonNull).distinct().forEach(contacts::add);
        }
        return List.copyOf(contacts);
    }

    private TeamReference resolveTeam(String rawId, TeamReference old) {
        String id = text(rawId);
        if (id.isBlank()) return null;
        if (old != null && old.id().equals(id)) return old;
        return teams.getAllTeams().stream().filter(team -> team.getId().equals(id)).findFirst()
                .map(team -> new TeamReference(team.getId(), team.getName()))
                .orElseThrow(() -> new ValidationException("Det valgte teamet finnes ikke. Velg team på nytt."));
    }

    private void validateUrl(String url) {
        if (url.isBlank()) return;
        try {
            URI uri = URI.create(url);
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null) return;
        } catch (IllegalArgumentException ignored) {
            // Report the same useful validation message for malformed and unsupported URLs.
        }
        throw new ValidationException("Lenke til brukerstøtte må være en gyldig http- eller https-adresse.");
    }

    static UUID idFor(String code) {
        return UUID.nameUUIDFromBytes(("system-information:" + code).getBytes(StandardCharsets.UTF_8));
    }

    private static String text(String value) { return value == null ? "" : value.trim(); }

    private SystemInformationResponse response(SystemInformation entity) {
        return new SystemInformationResponse(entity.getSystemCode(), entity.getVersion(), entity.getData(),
                entity.getLastModifiedDate(), entity.getLastModifiedBy());
    }
}
