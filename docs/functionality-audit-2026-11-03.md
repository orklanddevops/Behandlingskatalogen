# Functionality audit — 3 November 2026

## Follow-up implementation

The user confirmed that Norway-only country coverage is intentional. International country coverage is therefore outside the product scope, rather than a requested fix.

The requested fixes now cover write permissions, offline organization/dashboard behavior, URL query state, manual quality-system links in internal Word exports, and responsible-unit usage/deletion/replacement. Revision notifications and outbound mail remain disabled because the feature is not in use. Delivery is additionally restricted to `orkland.kommune.no`, including for previously queued messages. No Entra-group notification behavior was added.

The runtime organization failure was traced to a request to the placeholder `https://nom/graphql` endpoint. The local profile now defaults to kodeverk with NOM disabled, including installations whose older container settings omit the flag. The dashboard displays an error and retry control if a lookup still fails.

Verification after these fixes: 59 frontend tests passed; the backend component run passed 120 tests with two environment-dependent tests skipped; all three system-information database tests then passed against a separate temporary PostgreSQL database. Frontend lint, type checking and the production build passed. No email was sent during verification.

The original findings below record the state at the time of the audit. Deployment must be rebuilt to use the source changes.

## Scope and limits

Reviewed frontend routes, forms, API clients, backend controllers, authentication rules, integration fallbacks, exports, code-list reference handling, deployment configuration and automated checks. Read-only smoke checks targeted the existing local service at http://127.0.0.1:3000. This is not evidence of the state of the production VM, and the local running service may not match the current source/configuration. No application data was created, updated or deleted. No application behavior was changed during this audit.

The permission check used the actual security configuration with a dummy controller in a temporary isolated Spring context. It did not send write requests to the application. Real Microsoft sign-in, Graph consent, email delivery, production configuration and complete browser journeys were not tested. Database integration tests requiring a separately configured database were not run.

## Findings, ordered by priority

### 1. Critical: write permissions are bypassed for the main CRUD endpoints

Confirmed in an isolated reproduction with `polly.security.enabled=true`. Anonymous POST `/process`, PUT `/process/id`, and DELETE `/process/id` all reached dummy handlers and returned 200. The same probe against PUT `/system-information/id` returned 403, showing that the explicit protection on that route works.

`WebSecurityConfig.java:112` permits `/**` before the WRITE-role fallback on line 113. The main process controller has no method-level role guard. Other write endpoints falling through the same rule are also affected. Hiding edit buttons in the frontend does not enforce backend authorization.

Action: remove the catch-all permission rule, define intended anonymous reads explicitly, and cover anonymous, read-only and writer CRUD access with security tests. This should be addressed before exposing a deployment to untrusted users. The audit did not attempt to exploit a production deployment.

Sources: `apps/backend/polly-app/src/main/java/no/nav/data/common/security/WebSecurityConfig.java:112`, `apps/backend/polly-app/src/main/java/no/nav/data/polly/process/ProcessWriteController.java:55`.

### 2. High: international-transfer country selection is incomplete

Confirmed locally: `/api/codelist/countries` returns only NOR; `/api/codelist/countriesoutsideeea` returns an empty list. The bundled `Landkoder.json` contains only Norway. The disclosure form populates its foreign-country selector from the outside-EEA list, so a user cannot select a third country such as the US or UK in this configuration.

Action: supply a complete maintained country list and EEA membership list, then exercise disclosure creation and editing with a country outside the EEA.

Sources: `azure_function/data/kodeverk/Landkoder.json:1`, `azure_function/data/kodeverk/EEAFreg.json:1`, `apps/frontend/app/components/ThirdParty/ModalThirdPartyForm.tsx:459`.

### 3. High: local dashboard and organization lookups currently fail

Confirmed locally: `/api/dash?filter=ALL`, `COMPLETED` and `IN_PROGRESS`, plus `/api/nom/avdelinger` and `/api/nom/fylker`, return HTTP 500. Health and the main entity-list endpoints return 200. The dashboard component does not catch lookup errors and remains on its loading indicator. Treatment and disclosure organization selectors also depend on the failing organization endpoint.

The source includes a local kodeverk fallback when NOM is disabled. The VM configuration disables NOM, so the observed behavior needs investigation of the running build/configuration and backend logs; a precise cause was not established. Do not assume that enabling NAV NOM is the solution.

The local database is also largely unconfigured: `/api/codelist` exposes only SENSITIVITY and GDPR_ARTICLE, with no PURPOSE, SYSTEM or DEPARTMENT entries. Required selectors cannot offer options until these are configured. This is a local setup gap, not proof that production data is missing.

Action: verify the deployed build and safe configuration toggles, inspect the organization error, populate the required local lists, and give failed lookups visible errors and retry controls.

Sources: `compose.vm.yaml:57`, `apps/backend/polly-app/src/main/java/no/nav/data/integration/nom/NomGraphClient.java:75`, `apps/frontend/app/components/mainPages/dashboardPage.tsx:21`, `apps/frontend/app/components/Process/common/FieldDepartment.tsx:34`.

### 4. Medium: the post-creation information-type prompt cannot open

Confirmed by source tracing. `useLocation()` starts with Next's `usePathname()`, which excludes the URL query and fragment, then tries to extract those parts from that pathname. Consequently `location.search` is empty. `ProcessCreatedModal` requires that search string to contain `create`, so the prompt offering to add information types after creating a treatment stays closed. Login return links built with the same helper also lose query/fragment state.

Action: obtain search parameters from the appropriate Next hook and preserve the browser fragment where needed; test creation and return-from-login flows.

Sources: `apps/frontend/app/util/router.ts:102`, `apps/frontend/app/components/Process/Accordion/ProcessCreatedModal.tsx:19`, `apps/frontend/app/components/Header.tsx:28`.

### 5. Medium: revision notifications still depend on NAV employee identities

Confirmed by source tracing; actual email delivery was not attempted. `AzureUserInfo` reads the `NAVident` claim as the employee identity. The revision-email path then accepts only audit stamps matching one letter and six digits, such as A123456. An ordinary Orkland Entra user without that NAV-specific claim produces a null identity and will not match the recipient parser. Revision status can therefore change without an email being scheduled. This also explains the potential `null - Name` editor attribution.

Even after identity mapping is corrected, the offline resource service resolves no employee, and the mail provider requires separate mailbox credentials and Mail.Send configuration. These are additional configuration dependencies, not verified delivery failures.

Action: use a stable Orkland Entra identity consistently in audit records and recipient resolution; test that a revision request queues a message for a non-NAV user, then verify delivery separately with authorization.

Sources: `apps/backend/polly-app/src/main/java/no/nav/data/common/security/azure/AzureConstants.java:15`, `apps/backend/polly-app/src/main/java/no/nav/data/common/security/azure/AzureUserInfo.java:36`, `apps/backend/polly-app/src/main/java/no/nav/data/common/security/SecurityUtils.java:16`, `apps/backend/polly-app/src/main/java/no/nav/data/polly/process/ProcessService.java:141`.

### 6. Medium: saved quality-system links are missing from Word exports

Confirmed by source tracing. The treatment overview now reads `qualitySystemLinks`, but `ProcessToDocx` still exports only the older DPIA fields. It never reads the new link object. A Word export therefore omits the manually added Databehandleravtale, DPIA, Initiell DPIA, ROS, Hovedavtale and Annen avtale links.

Action: add the links to the appropriate export variants and verify a generated document containing populated fields. The existing passing DOCX tests do not cover these new fields.

Source: `apps/backend/polly-app/src/main/java/no/nav/data/polly/export/ProcessToDocx.java:339`.

### 7. Medium: responsible-unit references are missing from kodeverk usage checks

Confirmed by source tracing. The new system-information `organisationalUnit` stores a DEPARTMENT code, but `CodeUsageService` and `CodeUsageResponse` do not inspect system-information records. An enhet used only by a system-information record can therefore appear unused and pass deletion checks. Replacement also does not update that reference. The UI's fallback may retain the raw code, but its link to the maintained list is lost.

Action: include system-information references in usage display, deletion protection and replacement. This is an integration gap in the recent responsible-unit change.

Sources: `apps/backend/polly-app/src/main/java/no/nav/data/polly/codelist/codeusage/CodeUsageService.java:103`, `apps/backend/polly-app/src/main/java/no/nav/data/polly/codelist/dto/CodeUsageResponse.java:41`, `apps/backend/polly-app/src/main/java/no/nav/data/polly/systeminformation/SystemInformationService.java:61`.

### 8. Low: the disable-dataprocessor-activities flag has no effect

Confirmed by source inspection. `NEXT_PUBLIC_DISABLE_DP_PROCESS` exists, but the checks in the creation and editing controls have been commented out. Setting it to true will not disable those actions. Its current local value is false, so this is a broken configuration switch rather than a currently disabled screen.

Sources: `apps/frontend/app/components/mainPages/DpProcessPage.tsx:56`, `apps/frontend/app/components/DpProcess/DpProcessView.tsx:137`.

### 9. Verification automation is partly disabled or failing

All seven files under `.github/workflows` use the `.md` extension. GitHub Actions will not discover these as workflow definitions; automatic build, test and image-publishing jobs in those files do not run.

The backend component suite fails two tests: `NomGraphClientOfflineTest.disabledIntegrationNeedsNeitherNavNetworkNorTokens` expects an empty organization list despite the implemented local-list fallback, and `CodelistControllerTest.GetMethods.findAll` expects 14 list keys but gets 12. These are confirmed test failures; they are not, by themselves, proof that the corresponding application features are broken. The VM backend Dockerfile skips backend tests, so these failures do not block that image build.

Action: decide which workflows should run, restore those as actual workflow files, and align the backend tests with the intended fallback and empty-list response contract.

Sources: `.github/workflows/frontend.md:1`, `apps/backend/Dockerfile.vm:21`, `apps/backend/polly-test/polly-test-component/src/test/java/no/nav/data/integration/nom/NomGraphClientOfflineTest.java:16`, `apps/backend/polly-test/polly-test-component/src/test/java/no/nav/data/polly/codelist/CodelistControllerTest.java:82`.

## Intentionally disabled or externally dependent features

- Automatic NAV Etterlevelse/PVK retrieval is disabled in the VM configuration. Manual quality-system links are the intended current alternative; no quality-system integration exists yet.
- NAV term-catalog lookup is disabled and its fallback returns no terms.
- NAV Teamkatalogen and NOM network integrations are disabled. Local kodeverk replaces organization/team lists; product areas have no offline implementation.
- Entra employee lookup is optional and disabled by default. The current local employee search returns no results. In that mode, new employees cannot be selected as system owner, administrator or superuser. Enabling lookup requires the configured directory permissions; those were not tested here.
- Risikoeier is explicitly hidden by `NEXT_PUBLIC_DISABLE_RISK_OWNER=true` in the checked frontend environment.
- Delete actions blocked by linked records, and external Word export blocked until a treatment is completed, are deliberate rules rather than broken buttons.

## Checks performed

| Check | Result |
| --- | --- |
| Frontend tests | 12 suites, 55 tests passed |
| Frontend TypeScript | Passed |
| Frontend ESLint | Passed |
| Frontend production build | Passed |
| Backend component tests | 114 total: 110 passed, 2 failed, 2 skipped |
| VM command tests | 15 passed |
| Authentication/certificate setup and renewal tests | 20 passed |
| Existing local deployment smoke suite | 14/15 passed; dashboard failed |
| Additional local read-only API checks | Confirmed organization failures, incomplete countries and missing setup lists |
| Isolated security probe | Anonymous main CRUD reached handlers despite security being enabled |

Passing builds and unit tests do not establish that the real integrations or complete browser workflows function. No production deployment, permission changes, email sending or data repair was performed.
