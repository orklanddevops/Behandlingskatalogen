# Organisasjonskart fra eADM

Databehandlingskatalogen henter organisasjonskartet på backend og lagrer siste gyldige kopi
i PostgreSQL (GENERIC_STORAGE, type ORGANISATION_CHART). Brukerens innlogging brukes
bare til å lese kartet fra vår backend. Lesing utløser aldri et kall til eADM.

## Datakilde og autentisering

Samme eksport som i Intune-dashboard:
POST https://api.eadm.no/service.asmx/getorganizationchart
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Body: orgnr=NO921233418

Intune-dashboard sender ingen brukertoken eller passord til denne eksporten. En kontroll
11. november 2026 ga 118 avdelinger med unike avdelingsnumre og gyldige foreldrekoblinger.
Dette er ikke et delegert Microsoft Graph-kall og krever ingen nye Entra-tillatelser.

Vi lagrer bare avdelingsnummer, foreldreavdelingsnummer, navn og ledernavn samt
tidspunkt/status for importen. Rå eksport med øvrige kontaktfelter lagres ikke.
Enhet (DEPARTMENT), Avdeling (SEKSJON) og Underavdeling (SUB_DEPARTMENT) styres fullt
av organisasjonskartet. Enheter i eADM fyller Enhet, direkte Avdelinger under en Enhet
fyller Avdeling, og Avdelinger under andre Avdelinger fyller Underavdeling.
Rammeområder og grupper for personer uten arbeidsforhold vises kun i organisasjonskartet.
Avdelingsnummer fra eADM brukes som stabil kode; kodebeskrivelsene inneholder ikke ledernavn.

En gyldig import erstatter gamle oppføringer i disse tre kategoriene i samme
databasetransaksjon som kartet lagres. Eksisterende tilknytninger flyttes automatisk
når gammelt navn har én entydig match i samme kategori (uavhengig av store/små bokstaver
og ekstra mellomrom). Tvetydige eller manglende treff gjettes ikke; de gamle kodene
fjernes som avtalt, men referanser i tidligere registreringer må da korrigeres manuelt.
Synkroniseringsloggen viser antall gamle koder uten entydig match, uten personopplysninger.
Tilordninger slettes ikke automatisk fra eksisterende databehandlinger.

Manuell oppretting, redigering og sletting av disse kategoriene er sperret for alle,
inkludert administratorer, både i grensesnitt og backend. Team er fortsatt separat,
og administratorer beholder oppretting/redigering/sletting for Team.
Avdeling filtreres etter valgt Enhet; Underavdeling filtreres etter valgt gren.

## Drift

VM-oppsettet aktiverer integrasjonen som standard. Backendens øvrige miljøer har den
avslått som standard. Valgfrie verdier i den eksisterende, lokale .env.vm:

- EADM_ENABLED=true
- EADM_ORGANIZATION_NUMBER=NO921233418
- EADM_MINIMUM_DEPARTMENTS=50
- EADM_CRON=0 0 4 * * *

Kjør eksisterende deploy etter kodeoppdateringen: npm run deploy.
Dette bygger og starter appen med de nye innstillingene. Denne endringen deployer ikke automatisk.

Daglig import kjører klokken 04:00 i Europe/Oslo, også gjennom sommer-/vintertid.
Ved oppstart importeres kartet hvis det mangler eller er over ett døgn gammelt.
Ny omstart med fersk kopi krever ikke et nytt eADM-kall. Kategoriene oppdateres også
fra en fersk lagret kopi ved oppstart. En eldre kopi uten enhetstyper hentes på nytt.
Kjør bare én backend med synkronisering aktivert; planen og låsen gjelder per prosess.

Backend trenger utgående HTTPS til api.eadm.no. Bruk eksisterende CA-oppsett for
kommunens nettverk; sertifikatkontroll skal være aktivert.

Tomt/for lite kart, ugyldig JSON, feilstatus, duplikate ID-er, manglende foreldre,
sykluser og fall på mer enn 25 prosent i antall avdelinger avvises.
Forrige gyldige kart beholdes ved feil og vises med varsel om mislykket oppdatering.
Ved en stor, tilsiktet omorganisering må importgrensene vurderes før nytt kart godtas.
Leder-/avdelingsnavn eller eksportinnhold skrives ikke til synkroniseringsloggen.

## API og visning

- GET /organisation leser kun fra databasen; krever innlogging når appens sikkerhet er aktivert.
- POST /organisation/refresh lar administrator hente et nytt kart fra eADM.
- /organisasjon viser hierarkiet, ledernavn, søk, utvid/lukk og tidspunkt for siste gyldige import.
- «Last inn oversikten» leser backendens kopi på nytt.
- «Hent på nytt fra eADM» er bare tilgjengelig for administrator.

Sikkerhetsoppsettet må være aktivert i miljøer med faktiske brukere, slik som for appens
andre interne opplysninger. Ingen import trenger brukerens token.
