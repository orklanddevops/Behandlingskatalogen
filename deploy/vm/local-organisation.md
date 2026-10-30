# Local organisation lists

When NOM and Teamkatalogen are disabled, manage the four organisation fields under **Admin → Kodeverk**:

| Form field | Displayed code list | Stored list identifier |
| --- | --- | --- |
| Enhet | ENHET | DEPARTMENT |
| Avdeling (multiple selections) | AVDELING | SEKSJON |
| Underavdeling | UNDER_AVDELING | SUB_DEPARTMENT |
| Team | TEAM | TEAM |

Use **Opprett ny kode** and supply a stable code, name, and description.
Avdelinger are a shared list available for every Enhet. Changing Enhet retains selected Avdelinger.
All four selectors show a scrollable list when opened and filter immediately as you type,
including one- and two-character names such as IT. Selected values can be removed individually.
Saved code edits appear when the form is reopened, without restarting the backend.

Existing list identifiers and saved affiliations are retained for compatibility.
Avdeling codes are included in usage checks and replacement for both treatments and processor activities;
codes in use cannot be deleted until their references have been replaced.

The VM also sets `CLIENT_ETTERLEVELSE_ENABLED=false`. PVK documents from NAV's
internal Etterlevelse service are unavailable in this deployment.
Deploy the backend and frontend together for the new AVDELING code list.
