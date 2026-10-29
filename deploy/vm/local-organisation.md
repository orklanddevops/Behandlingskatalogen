# Local organisation lists

The VM disables NOM and Teamkatalogen because those services belong to NAV.
When these integrations are disabled, the application reads organisation options
from the code lists managed under **Admin → Kodeverk**:

| Field | Code list |
| --- | --- |
| Avdeling | DEPARTMENT |
| Team | TEAM |
| Linja / subdepartment | SUB_DEPARTMENT |

Use **Opprett ny kode** and fill in a stable code, a display name and a description.
Saved departments appear in Avdeling when the form is opened again.
Saved teams appear in Team searches matching at least three characters.
Code edits are available on the next request, without restarting the backend.
No sections are generated for local departments.

Team codes are also included in code usage checks, so a code in use cannot be
deleted until its references are replaced. Existing organisation IDs remain stored;
adding local codes does not migrate or overwrite existing affiliations.

The VM also sets `CLIENT_ETTERLEVELSE_ENABLED=false`. PVK documents from NAV's
internal Etterlevelse service are unavailable in this deployment. Environments
that use that service can enable it and configure `CLIENT_ETTERLEVELSE_URL`.

Deploy both the backend and frontend together to make the TEAM list available.
The compose configuration change also requires recreating the backend container.
