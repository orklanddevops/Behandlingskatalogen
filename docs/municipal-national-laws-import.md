# Engangsimport av kommunerelevante lover

Vurdert 2026-11-11: 753 eksportdokumenter, 179 valgte lover. 59 er merket situasjonsavhengige.

Utvalget bygger på gjennomgang av titler og metadata i hele eksporten, med kontroll av virkeområde og ikrafttredelse for grensetilfeller. Det omfatter kommunal myndighetsutøvelse, tjenester, arbeidsgiverrollen og relevante eiendoms-, eier- og driftsoppgaver.
Situasjonsavhengig betyr at loven bare er relevant når kommunen eller et kommunalt foretak faktisk har rollen som er beskrevet. Utvalget er en lovkatalog, ikke en forhåndsvurdering av behandlingsgrunnlag for en bestemt databehandling. Konkret paragraf og GDPR-grunnlag må fortsatt angis i den enkelte registreringen.

## Import og drift

- Flyway-migreringen V1.41 kjøres én gang ved neste backend-utrulling. Ingen ny API-kobling, planlagt jobb eller løpende lovsynkronisering opprettes.
- Migreringen legger bare til manglende NATIONAL_LAW-oppføringer. Den sletter eller overskriver ikke eksisterende koder og endrer ikke registrerte databehandlinger.
- En eksisterende oppføring med samme Lovdata-ID beholdes under sin eksisterende kode, også dersom den bruker en kortkode som FTRL. Vanlige Lovdata-URL-er og LOV-prefiks gjenkjennes ved duplikatkontroll.
- Nye koder har format LOV_YYYY_MM_DD_NR. Kortnavn hentes fra eksporten; beskrivelsen er Lovdatas dato-/nummersuffiks slik at appens paragraf- og kapittellenker fungerer.
- Det følger ingen fulltekst av lovene med appen. Utvalgsfilen har kildefilnavn, SHA-256, relevans og begrunnelse.
- Eksisterende utdaterte lovoppføringer ryddes ikke i denne importen. Dette må eventuelt vurderes separat uten å bryte lagrede referanser.

## Verifikasjon

Kjør databastesten med `pg_virtualenv -t python3 scripts/test-municipal-laws.py`.
Testen bruker et midlertidig PostgreSQL-kluster og avviser kjøring uten dette testmiljøet.
Den kontrollerer tom database, gjentatt kjøring, eksisterende kortkoder/Lovdata-URL-er,
kodekollisjoner og at andre kategorier beholdes. Frontendens kodevalidering er justert
til samme format som backend (store bokstaver, tall og understrek), slik at importerte
Lovdata-koder også kan håndteres i administrasjonsskjemaene.

## Ikrafttredelse og avgrensning

Rene endringslover er utelatt til fordel for konsoliderte hovedlover. Nye hovedlover uten fastsatt ikrafttredelse er satt på vent, blant annet ny forvaltningslov, ny barnelov, ny inkassolov og ny motorferdsellov i eksporten. Delvis ikrafttredelse er bevart i utvalgsfilens metadata; ikke alle bestemmelser er dermed nødvendigvis operative.
Ny arkivlov, viltressurslov, vass- og avløpsanleggslov og minerallov er tatt med etter kontroll av ikrafttredelse. Besøksbidragsloven tas med for forberedende kommunale oppgaver; innkreving er tidligst mulig fra 2027 og krever at vilkårene er oppfylt.

Kontrollkilder:
- [Ny arkivlov fra 2026](https://www.regjeringen.no/no/aktuelt/ny-arkivlov-trer-i-kraft-1.-januar-2026/id3110253/)
- [Viltressursloven fra juli 2026](https://www.regjeringen.no/no/aktuelt/viltressursloven-trer-i-kraft-1.-juli-2026/id3167961/)
- [Ny vass- og avløpsanleggslov](https://www.regjeringen.no/no/dokumenter/prop.-83-l-20252026/id3154375/?ch=3)
- [Besøksbidrag: lov i kraft, avgift tidligst 2027](https://www.regjeringen.no/no/tema/naringsliv/reiseliv/besoksbidrag/id3139795/)
- [Ny minerallov fra juli 2026](https://www.regjeringen.no/no/aktuelt/ny-minerallov-skal-sikre-barekraftig-mineralnaring-for-framtiden/id3110134/)
- [Forvaltningsloven av 2025 er ikke satt i kraft i eksporten](https://lovdata.no/dokument/NL/lov/2025-06-20-81)
- [Forskriftshjemmel for frivillige barne- og familietiltak](https://lovdata.no/dokument/NL/lov/2022-06-17-44)

## Fordeling

| Område | Antall |
| --- | ---: |
| Arbeidsgiver og personell | 14 |
| Barn, oppvekst og integrering | 12 |
| Beredskap og sikkerhet | 6 |
| Bolig og sosiale tjenester | 15 |
| Eiendom, plan og bygg | 17 |
| Forvaltning og rettigheter | 23 |
| Helse og omsorg | 19 |
| Kultur, språk og livssyn | 11 |
| Miljø, landbruk og natur | 20 |
| Næring, tillatelser og tilskudd | 4 |
| Tekniske tjenester og samferdsel | 11 |
| Økonomi, avtaler og eierskap | 27 |

## Valgte lover

| Lov | Område | Relevans | Begrunnelse |
| --- | --- | --- | --- |
| [A-opplysningsloven](https://lovdata.no/lov/2012-06-22-43) | Arbeidsgiver og personell | generell | Kommunal lønns- og arbeidsforholdsrapportering gjennom a-ordningen. |
| [Allmenngjøringsloven](https://lovdata.no/lov/1993-06-04-58) | Arbeidsgiver og personell | generell | Oppfølging av lønns- og arbeidsvilkår i kommunale leverandørkjeder. |
| [Arbeidsmiljøloven](https://lovdata.no/lov/2005-06-17-62) | Arbeidsgiver og personell | generell | Kommunens arbeidsmiljø, ansettelsesforhold og arbeidsgiverplikter. |
| [Arbeidstvistloven](https://lovdata.no/lov/2012-01-27-9) | Arbeidsgiver og personell | generell | Tariffavtaler og arbeidstvister i kommunens arbeidsgiverrolle. |
| [EØS-arbeidstakarlova](https://lovdata.no/lov/2012-12-14-81) | Arbeidsgiver og personell | generell | Likebehandling av EØS-arbeidstakere i relevante arbeidsgiver- og tjenesteforhold. |
| [Ferieloven](https://lovdata.no/lov/1988-04-29-21) | Arbeidsgiver og personell | generell | Ferie og feriepenger for kommunalt ansatte. |
| [Folketrygdloven](https://lovdata.no/lov/1997-02-28-19) | Arbeidsgiver og personell | generell | Arbeidsgiveroppfølging, sykepengerefusjon og samhandling om trygdeytelser. |
| [Lov om 1 og 17 mai](https://lovdata.no/lov/1947-04-26-1) | Arbeidsgiver og personell | generell | Kommunen som arbeidsgiver på 1. og 17. mai. |
| [Lov om pensjon for oppdragstaker i barnevernet](https://lovdata.no/lov/2010-02-12-4) | Arbeidsgiver og personell | situasjonsavhengig | Pensjonsordning for relevante oppdragstakere i kommunalt barnevern. |
| [Permitteringslønnsloven](https://lovdata.no/lov/1988-05-06-22) | Arbeidsgiver og personell | situasjonsavhengig | Arbeidsgiverplikter ved eventuell permittering. |
| [Samordningsloven](https://lovdata.no/lov/1957-07-06-26) | Arbeidsgiver og personell | situasjonsavhengig | Samordning av offentlige tjenestepensjonsytelser. |
| [Sykepleierpensjonsloven](https://lovdata.no/lov/1962-06-22-12) | Arbeidsgiver og personell | generell | Pensjonsordning for kommunalt ansatte sykepleiere. |
| [Yrkeskvalifikasjonsloven](https://lovdata.no/lov/2017-06-16-69) | Arbeidsgiver og personell | situasjonsavhengig | Godkjenning av yrkeskvalifikasjoner i relevante kommunale stillinger. |
| [Yrkesskadeforsikringsloven](https://lovdata.no/lov/1989-06-16-65) | Arbeidsgiver og personell | generell | Yrkesskadeforsikring for kommunens ansatte. |
| [Adopsjonsloven](https://lovdata.no/lov/2017-06-16-48) | Barn, oppvekst og integrering | situasjonsavhengig | Kommunal bistand og samhandling i adopsjonssaker der oppgaver er lagt til kommunen. |
| [Barnehageloven](https://lovdata.no/lov/2005-06-17-64) | Barn, oppvekst og integrering | generell | Kommunen som barnehageeier, barnehagemyndighet og opptaksmyndighet. |
| [Barnelova](https://lovdata.no/lov/1981-04-08-7) | Barn, oppvekst og integrering | generell | Foreldreansvar og barns rettigheter i kommunale tjenester. |
| [Barnevernsloven](https://lovdata.no/lov/2021-06-18-97) | Barn, oppvekst og integrering | generell | Kommunal barnevernstjeneste, undersøkelser, tiltak og oppfølging. |
| [Ekteskapsloven](https://lovdata.no/lov/1991-07-04-47) | Barn, oppvekst og integrering | generell | Kommunal vigsel og behandling av vigselssaker. |
| [Integreringsloven](https://lovdata.no/lov/2020-11-06-127) | Barn, oppvekst og integrering | generell | Kommunalt introduksjonsprogram, norskopplæring og integrering. |
| [Lov om forskriftshjemmel for behandling av personopplysninger for frivillige tiltak på barne-, oppvekst- og familieområdet mv](https://lovdata.no/lov/2022-06-17-44) | Barn, oppvekst og integrering | situasjonsavhengig | Frivillige tiltak på barne-, oppvekst- og familieområdet når en relevant forskrift gir grunnlag; loven er ikke en generell behandlingshjemmel. |
| [Lov om Haagkonvensjonen 1996](https://lovdata.no/lov/2015-09-04-85) | Barn, oppvekst og integrering | situasjonsavhengig | Kommunalt barnevern og samarbeid i internasjonale barnevernssaker. |
| [Opplæringslova](https://lovdata.no/lov/2023-06-09-30) | Barn, oppvekst og integrering | generell | Kommunal grunnskole, SFO og opplæring for voksne innen lovens virkeområde. |
| [Privatskolelova](https://lovdata.no/lov/2003-07-04-84) | Barn, oppvekst og integrering | generell | Kommunale oppgaver og samarbeid om elever i private grunnskoler. |
| [Utlendingsloven](https://lovdata.no/lov/2008-05-15-35) | Barn, oppvekst og integrering | situasjonsavhengig | Kommunal samhandling om bosetting, opphold og tjenester til utlendinger. |
| [Voksenopplæringsloven](https://lovdata.no/lov/2009-06-19-95) | Barn, oppvekst og integrering | situasjonsavhengig | Tilskudd og samarbeid om voksenopplæring der loven gjelder; grunnopplæring reguleres av opplæringslova. |
| [Brann- og eksplosjonsvernloven](https://lovdata.no/lov/2002-06-14-20) | Beredskap og sikkerhet | generell | Kommunalt brann- og redningsvesen, forebygging og tilsyn. |
| [Digitalsikkerhetsloven](https://lovdata.no/lov/2023-12-20-108) | Beredskap og sikkerhet | situasjonsavhengig | Digital sikkerhet i kommunale virksomheter som omfattes, for eksempel relevante drikkevannstjenester. |
| [Helseberedskapsloven](https://lovdata.no/lov/2000-06-23-56) | Beredskap og sikkerhet | generell | Kommunal helseberedskap og beredskapsplanlegging. |
| [Næringsberedskapsloven](https://lovdata.no/lov/2011-12-16-65) | Beredskap og sikkerhet | situasjonsavhengig | Kommunal samhandling om forsynings- og næringsberedskap. |
| [Sikkerhetsloven](https://lovdata.no/lov/2018-06-01-24) | Beredskap og sikkerhet | generell | Forebyggende sikkerhet der kommunen eller virksomheten er omfattet. |
| [Sivilbeskyttelsesloven](https://lovdata.no/lov/2010-06-25-45) | Beredskap og sikkerhet | generell | Kommunal beredskapsplikt, risiko- og sårbarhetsanalyser og beredskapsplan. |
| [Arbeidsmarkedsloven](https://lovdata.no/lov/2004-12-10-76) | Bolig og sosiale tjenester | situasjonsavhengig | Kommunens arbeidsgiverrolle og samarbeid med statlig del av NAV. |
| [Boligsosialloven](https://lovdata.no/lov/2022-12-20-121) | Bolig og sosiale tjenester | generell | Kommunens bistand til vanskeligstilte på boligmarkedet. |
| [Burettslagslova](https://lovdata.no/lov/2003-06-06-39) | Bolig og sosiale tjenester | situasjonsavhengig | Kommunalt eierskap til og utleie av borettslagsboliger. |
| [Bustøttelova](https://lovdata.no/lov/2012-08-24-64) | Bolig og sosiale tjenester | generell | Kommunal medvirkning ved søknader og saksbehandling av bostøtte. |
| [Finansavtaleloven](https://lovdata.no/lov/2020-12-18-146) | Bolig og sosiale tjenester | situasjonsavhengig | Kommunale kredittavtaler, særlig startlån, når kommunen opptrer som kredittyter. |
| [Gjeldsordningsloven](https://lovdata.no/lov/1992-07-17-99) | Bolig og sosiale tjenester | generell | Økonomisk rådgivning, gjeldsordning og kommunale kreditorforhold. |
| [Husbankloven](https://lovdata.no/lov/2009-05-29-30) | Bolig og sosiale tjenester | generell | Kommunal samhandling med Husbanken, herunder boligfinansiering. |
| [Husleieloven](https://lovdata.no/lov/1999-03-26-17) | Bolig og sosiale tjenester | generell | Kommunale utleieboliger og kommunens øvrige leieforhold. |
| [Krisesenterlova](https://lovdata.no/lov/2009-06-19-44) | Bolig og sosiale tjenester | generell | Kommunens krisesentertilbud. |
| [Lov om kommunal forkjøpsrett til leiegårder](https://lovdata.no/lov/1977-04-29-34) | Bolig og sosiale tjenester | situasjonsavhengig | Kommunal forkjøpsrett til leiegårder. |
| [Nav-loven](https://lovdata.no/lov/2006-06-16-20) | Bolig og sosiale tjenester | generell | Kommunens NAV-kontor og samarbeid med statlig arbeids- og velferdsforvaltning. |
| [Panteloven](https://lovdata.no/lov/1980-02-08-2) | Bolig og sosiale tjenester | situasjonsavhengig | Pant og sikkerhet ved kommunale lån og eiendomsforvaltning. |
| [Sosialtjenesteloven](https://lovdata.no/lov/2009-12-18-131) | Bolig og sosiale tjenester | generell | Kommunale sosiale tjenester, økonomisk stønad og rådgivning i NAV. |
| [Straffegjennomføringsloven](https://lovdata.no/lov/2001-05-18-21) | Bolig og sosiale tjenester | situasjonsavhengig | Kommunal samhandling om tjenester ved løslatelse og straffegjennomføring. |
| [Vergemålsloven](https://lovdata.no/lov/2010-03-26-9) | Bolig og sosiale tjenester | generell | Meldinger og samhandling om vergemål for brukere av kommunale tjenester. |
| [Avhendingslova](https://lovdata.no/lov/1992-07-03-93) | Eiendom, plan og bygg | generell | Kommunens kjøp og salg av fast eiendom. |
| [Dokumentavgiftsloven](https://lovdata.no/lov/1975-12-12-59) | Eiendom, plan og bygg | situasjonsavhengig | Dokumentavgift ved kommunale eiendomstransaksjoner. |
| [Eierseksjonsloven](https://lovdata.no/lov/2017-06-16-65) | Eiendom, plan og bygg | generell | Kommunal seksjonering og reseksjonering samt kommunens eierrolle. |
| [Ekspropriasjonserstatningslova](https://lovdata.no/lov/1984-04-06-17) | Eiendom, plan og bygg | generell | Erstatning ved kommunal ekspropriasjon. |
| [Geodataloven](https://lovdata.no/lov/2010-09-03-56) | Eiendom, plan og bygg | generell | Deling og tilgjengeliggjøring av offentlige geografiske data. |
| [Grannegjerdelova](https://lovdata.no/lov/1961-05-05) | Eiendom, plan og bygg | situasjonsavhengig | Gjerdehold og naboforhold for kommunale eiendommer. |
| [Grannelova](https://lovdata.no/lov/1961-06-16-15) | Eiendom, plan og bygg | generell | Kommunen som grunneier og nabo. |
| [Hevdslova](https://lovdata.no/lov/1966-12-09-1) | Eiendom, plan og bygg | situasjonsavhengig | Eiendoms- og rettighetsspørsmål knyttet til hevd. |
| [Jordskiftelova](https://lovdata.no/lov/2013-06-21-100) | Eiendom, plan og bygg | situasjonsavhengig | Kommunen som part og grunneier i jordskiftesaker. |
| [Matrikkellova](https://lovdata.no/lov/2005-06-17-101) | Eiendom, plan og bygg | generell | Kommunal matrikkelføring, oppmåling, eiendoms- og adresseinformasjon. |
| [Oreigningslova](https://lovdata.no/lov/1959-10-23-3) | Eiendom, plan og bygg | generell | Ekspropriasjon og kommunale grunnerverv. |
| [Plan- og bygningsloven](https://lovdata.no/lov/2008-06-27-71) | Eiendom, plan og bygg | generell | Kommunal arealplanlegging, byggesaksbehandling og tilsyn. |
| [Sameigelova](https://lovdata.no/lov/1965-06-18-6) | Eiendom, plan og bygg | situasjonsavhengig | Kommunalt sameie og forvaltning av felles eiendom. |
| [Servituttlova](https://lovdata.no/lov/1968-11-29) | Eiendom, plan og bygg | situasjonsavhengig | Forvaltning av bruksretter og servitutter på kommunal eiendom. |
| [Skjønnsprosessloven](https://lovdata.no/lov/1917-06-01-1) | Eiendom, plan og bygg | generell | Kommunale skjønnssaker ved ekspropriasjon og grunnavståelse. |
| [Tinglysingsloven](https://lovdata.no/lov/1935-06-07-2) | Eiendom, plan og bygg | generell | Registrering av kommunale eiendommer, rettigheter og heftelser. |
| [Tomtefestelova](https://lovdata.no/lov/1996-12-20-106) | Eiendom, plan og bygg | generell | Kommunen som bortfester eller fester av grunn. |
| [Arkivlova](https://lovdata.no/lov/2025-06-20-96) | Forvaltning og rettigheter | generell | Kommunens dokumentasjon og arkivforvaltning etter ny arkivlov. |
| [Domstolloven](https://lovdata.no/lov/1915-08-13-5) | Forvaltning og rettigheter | situasjonsavhengig | Kommunen som part i rettssaker og håndtering av domstolshenvendelser. |
| [EØS-loven](https://lovdata.no/lov/1992-11-27-109) | Forvaltning og rettigheter | generell | EØS-rettslige rammer for kommunale vedtak, anskaffelser og støtte. |
| [Flaggloven](https://lovdata.no/lov/1898-12-10-1) | Forvaltning og rettigheter | generell | Bruk av norsk flagg i kommunal virksomhet. |
| [Folkeregisterloven](https://lovdata.no/lov/2016-12-09-88) | Forvaltning og rettigheter | generell | Kommunal bruk av folkeregisteropplysninger og relevante meldeplikter. |
| [Forsøksloven](https://lovdata.no/lov/1992-06-26-87) | Forvaltning og rettigheter | situasjonsavhengig | Forsøk med organisering og oppgaveløsning i offentlig forvaltning. |
| [Forvaltningsloven](https://lovdata.no/lov/1967-02-10) | Forvaltning og rettigheter | generell | Saksbehandling, habilitet, taushetsplikt, vedtak og klager. |
| [Grunnloven](https://lovdata.no/lov/1814-05-17) | Forvaltning og rettigheter | generell | Grunnleggende rettigheter, legalitetsprinsipp og kommunalt selvstyre. |
| [Inndelingslova](https://lovdata.no/lov/2001-06-15-70) | Forvaltning og rettigheter | situasjonsavhengig | Kommunegrenser, sammenslåing og andre inndelingssaker. |
| [Kommuneloven](https://lovdata.no/lov/2018-06-22-83) | Forvaltning og rettigheter | generell | Kommunal organisering, internkontroll, økonomi og folkevalgte organer. |
| [Likestillings- og diskrimineringsloven](https://lovdata.no/lov/2017-06-16-51) | Forvaltning og rettigheter | generell | Likebehandling, universell utforming og diskrimineringsvern i tjenester og arbeidsforhold. |
| [Lov om elektroniske tillitstjenester](https://lovdata.no/lov/2018-06-15-44) | Forvaltning og rettigheter | generell | Elektroniske signaturer, tillitstjenester og digital kommunal saksbehandling. |
| [Lov om flagging på kommunale bygninger](https://lovdata.no/lov/1933-06-29-2) | Forvaltning og rettigheter | generell | Flagging på kommunale offentlige bygninger. |
| [Menneskerettsloven](https://lovdata.no/lov/1999-05-21-30) | Forvaltning og rettigheter | generell | Menneskerettigheter, barns rettigheter og vern av privatlivet. |
| [Offentleglova](https://lovdata.no/lov/2006-05-19-16) | Forvaltning og rettigheter | generell | Offentlig innsyn, journalføring og unntak fra innsyn. |
| [Personopplysningsloven](https://lovdata.no/lov/2018-06-15-38) | Forvaltning og rettigheter | generell | Personopplysningsvern og gjennomføring av personvernforordningen. |
| [Sivilombudsloven](https://lovdata.no/lov/2021-06-18-121) | Forvaltning og rettigheter | generell | Kommunal oppfølging og opplysningsplikt overfor Sivilombudet. |
| [Statistikkloven](https://lovdata.no/lov/2019-06-21-32) | Forvaltning og rettigheter | generell | Kommunale rapporteringsplikter til offisiell statistikk. |
| [Straffeloven](https://lovdata.no/lov/2005-05-20-28) | Forvaltning og rettigheter | generell | Avvergingsplikt og strafferettslige plikter i kommunal tjeneste. |
| [Straffeprosessloven](https://lovdata.no/lov/1981-05-22-25) | Forvaltning og rettigheter | situasjonsavhengig | Opplysnings- og vitneplikter i konkrete straffesaker. |
| [Tolkeloven](https://lovdata.no/lov/2021-06-11-79) | Forvaltning og rettigheter | generell | Kommunens ansvar for bruk av kvalifisert tolk i offentlige tjenester. |
| [Tvisteloven](https://lovdata.no/lov/2005-06-17-90) | Forvaltning og rettigheter | situasjonsavhengig | Kommunen som part i sivile tvister. |
| [Valgloven](https://lovdata.no/lov/2023-06-16-62) | Forvaltning og rettigheter | generell | Gjennomføring av kommunale, fylkeskommunale og nasjonale valg. |
| [Brukerromsloven](https://lovdata.no/lov/2004-07-02-64) | Helse og omsorg | situasjonsavhengig | Brukerromstilbud dersom kommunen oppretter slik tjeneste. |
| [Folkehelseloven](https://lovdata.no/lov/2011-06-24-29) | Helse og omsorg | generell | Kommunalt folkehelsearbeid og miljørettet helsevern. |
| [Helse- og omsorgstjenesteloven](https://lovdata.no/lov/2011-06-24-30) | Helse og omsorg | generell | Kommunale helse- og omsorgstjenester og behandling av tjenestesøknader. |
| [Helseforskningsloven](https://lovdata.no/lov/2008-06-20-44) | Helse og omsorg | situasjonsavhengig | Kommunen som ansvarlig for eller deltaker i medisinsk og helsefaglig forskning. |
| [Helsepersonelloven](https://lovdata.no/lov/1999-07-02-64) | Helse og omsorg | generell | Helsepersonells yrkesutøvelse, dokumentasjon og taushetsplikt. |
| [Helseregisterloven](https://lovdata.no/lov/2014-06-20-43) | Helse og omsorg | generell | Kommunal rapportering til og behandling i helseregistre når vilkårene gjelder. |
| [Helsetilsynsloven](https://lovdata.no/lov/2017-12-15-107) | Helse og omsorg | generell | Tilsyn med kommunale helse- og omsorgstjenester og opplysningsplikter. |
| [Legemiddelloven](https://lovdata.no/lov/1992-12-04-132) | Helse og omsorg | generell | Legemiddelhåndtering i kommunale helse- og omsorgstjenester. |
| [Lov om medisinsk utstyr](https://lovdata.no/lov/2020-05-07-37) | Helse og omsorg | generell | Bruk og håndtering av medisinsk utstyr i kommunale tjenester. |
| [Matloven](https://lovdata.no/lov/2003-12-19-124) | Helse og omsorg | generell | Kommunal vannforsyning, kjøkken og matservering. |
| [Pasient- og brukerrettighetsloven](https://lovdata.no/lov/1999-07-02-63) | Helse og omsorg | generell | Pasienters og brukeres rettigheter, samtykke og medvirkning. |
| [Pasientjournalloven](https://lovdata.no/lov/2014-06-20-42) | Helse og omsorg | generell | Kommunale pasientjournaler og behandlingsrettede helseregistre. |
| [Pasientskadeloven](https://lovdata.no/lov/2001-06-15-53) | Helse og omsorg | generell | Pasientskadeoppfølging i kommunale helsetjenester. |
| [Psykisk helsevernloven](https://lovdata.no/lov/1999-07-02-62) | Helse og omsorg | generell | Kommunale oppgaver ved psykisk helsevern og legeundersøkelser. |
| [Smittevernloven](https://lovdata.no/lov/1994-08-05-55) | Helse og omsorg | generell | Kommunale smittevernoppgaver og kommunelegens myndighet. |
| [Spesialisthelsetjenesteloven](https://lovdata.no/lov/1999-07-02-61) | Helse og omsorg | generell | Lovpålagt samarbeid mellom kommunen og spesialisthelsetjenesten. |
| [Strålevernloven](https://lovdata.no/lov/2000-05-12-36) | Helse og omsorg | situasjonsavhengig | Strålevern og radon i kommunale bygg og relevante tjenester. |
| [Tannhelsetjenesteloven](https://lovdata.no/lov/1983-06-03-54) | Helse og omsorg | situasjonsavhengig | Samarbeid med fylkeskommunal tannhelsetjeneste for kommunale tjenestemottakere; ikke kommunalt hovedansvar. |
| [Tobakksskadeloven](https://lovdata.no/lov/1973-03-09-14) | Helse og omsorg | generell | Kommunalt tilsyn med tobakkssalg og røykeforbud. |
| [Bildeprogramloven](https://lovdata.no/lov/2015-02-06-7) | Kultur, språk og livssyn | situasjonsavhengig | Aldersgrenser og beskyttelse av mindreårige ved kommunal filmvisning. |
| [Film- og videogramlova](https://lovdata.no/lov/1987-05-15-21) | Kultur, språk og livssyn | situasjonsavhengig | Kommunal kinodrift og filmvisning der dette tilbys. |
| [Folkebibliotekloven](https://lovdata.no/lov/1985-12-20-108) | Kultur, språk og livssyn | generell | Kommunens folkebibliotektilbud. |
| [Gravplassloven](https://lovdata.no/lov/1996-06-07-32) | Kultur, språk og livssyn | generell | Kommunal finansiering og planlegging av gravplasser og eventuell gravplassmyndighet. |
| [Kulturlova](https://lovdata.no/lov/2007-06-29-89) | Kultur, språk og livssyn | generell | Kommunens ansvar for kulturvirksomhet. |
| [Pliktavleveringslova](https://lovdata.no/lov/1989-06-09-32) | Kultur, språk og livssyn | situasjonsavhengig | Avlevering av kommunale publikasjoner som gjøres allment tilgjengelige. |
| [Sameloven](https://lovdata.no/lov/1987-06-12-56) | Kultur, språk og livssyn | generell | Samiske språk- og konsultasjonsrettigheter i kommunale saker. |
| [Språklova](https://lovdata.no/lov/2021-05-21-42) | Kultur, språk og livssyn | generell | Kommunale språkplikter og bruk av norsk i offentlig virksomhet. |
| [Stadnamnlova](https://lovdata.no/lov/1990-05-18-11) | Kultur, språk og livssyn | generell | Kommunale stedsnavn, adresser og navnevedtak. |
| [Trossamfunnsloven](https://lovdata.no/lov/2020-04-24-31) | Kultur, språk og livssyn | generell | Kommunal finansiering og oppgaver knyttet til tros- og livssyn, særlig Den norske kirke. |
| [Åndsverkloven](https://lovdata.no/lov/2018-06-15-40) | Kultur, språk og livssyn | generell | Kommunal publisering, bruk av foto, bibliotek og annet opphavsrettslig materiale. |
| [Beitelova](https://lovdata.no/lov/1961-06-16-12) | Miljø, landbruk og natur | situasjonsavhengig | Beitespørsmål og landbruksrelaterte lokale saker. |
| [Dyrehelsepersonelloven](https://lovdata.no/lov/2001-06-15-75) | Miljø, landbruk og natur | generell | Kommunale oppgaver knyttet til veterinærdekning og veterinærvakt. |
| [Forpaktingslova](https://lovdata.no/lov/1965-06-25-1) | Miljø, landbruk og natur | situasjonsavhengig | Forpaktingsavtaler og kommunale landbruksoppgaver. |
| [Forurensningsloven](https://lovdata.no/lov/1981-03-13-6) | Miljø, landbruk og natur | generell | Kommunale oppgaver innen forurensning, avløp, avfall og forsøpling. |
| [Friluftsloven](https://lovdata.no/lov/1957-06-28-16) | Miljø, landbruk og natur | generell | Kommunale oppgaver knyttet til friluftsliv, ferdsel og allmennhetens tilgang. |
| [Hundeloven](https://lovdata.no/lov/2003-07-04-74) | Miljø, landbruk og natur | generell | Lokale hundeforskrifter og kommunale oppgaver knyttet til hundehold. |
| [Jordlova](https://lovdata.no/lov/1995-05-12-23) | Miljø, landbruk og natur | generell | Kommunal jordbruksforvaltning, deling og omdisponering. |
| [Konsesjonsloven](https://lovdata.no/lov/2003-11-28-98) | Miljø, landbruk og natur | generell | Kommunal behandling av konsesjon og egenerklæringer om konsesjonsfrihet. |
| [Kulturminneloven](https://lovdata.no/lov/1978-06-09-50) | Miljø, landbruk og natur | generell | Kulturminnehensyn i plan-, bygge- og eiendomssaker. |
| [Lakse- og innlandsfiskloven](https://lovdata.no/lov/1992-05-15-47) | Miljø, landbruk og natur | generell | Lokal forvaltning av lakse- og innlandsfiskressurser. |
| [Miljøinformasjonsloven](https://lovdata.no/lov/2003-05-09-31) | Miljø, landbruk og natur | generell | Innsyn i miljøinformasjon og deltakelse i miljøsaker. |
| [Mineralloven](https://lovdata.no/lov/2025-06-20-107) | Miljø, landbruk og natur | situasjonsavhengig | Kommunale plan- og høringsroller ved mineralvirksomhet og masseuttak. |
| [Motorferdselloven](https://lovdata.no/lov/1977-06-10-82) | Miljø, landbruk og natur | generell | Kommunale tillatelser og dispensasjoner for motorferdsel i utmark. |
| [Naturmangfoldloven](https://lovdata.no/lov/2009-06-19-100) | Miljø, landbruk og natur | generell | Naturhensyn, arts- og områdeforvaltning i kommunale avgjørelser. |
| [Naturskadeloven](https://lovdata.no/lov/1994-03-25-7) | Miljø, landbruk og natur | generell | Kommunale sikrings- og arealoppgaver knyttet til naturskade. |
| [Odelslova](https://lovdata.no/lov/1974-06-28-58) | Miljø, landbruk og natur | situasjonsavhengig | Odelsrettslige spørsmål i landbruks- og eiendomssaker. |
| [Produktkontrolloven](https://lovdata.no/lov/1976-06-11-79) | Miljø, landbruk og natur | generell | Produkt- og kjemikaliesikkerhet i kommunens virksomheter. |
| [Reindriftsloven](https://lovdata.no/lov/2007-06-15-40) | Miljø, landbruk og natur | situasjonsavhengig | Arealplanlegging og samhandling med reindriftsinteresser der dette er aktuelt. |
| [Skogbrukslova](https://lovdata.no/lov/2005-05-27-31) | Miljø, landbruk og natur | generell | Kommunal skogbruksforvaltning og oppfølging av skogbrukstiltak. |
| [Viltressursloven](https://lovdata.no/lov/2025-06-20-102) | Miljø, landbruk og natur | generell | Kommunale oppgaver innen jakt, felling og viltforvaltning etter ny viltressurslov. |
| [Alkoholloven](https://lovdata.no/lov/1989-06-02-27) | Næring, tillatelser og tilskudd | generell | Kommunale salgs- og skjenkebevillinger og tilsyn. |
| [Besøksbidragsloven](https://lovdata.no/lov/2025-06-20-104) | Næring, tillatelser og tilskudd | situasjonsavhengig | Forberedelse av frivillig besøksbidrag i kvalifiserte reiselivskommuner; innkreving først fra 2027. |
| [Helligdagsfredloven](https://lovdata.no/lov/1995-02-24-12) | Næring, tillatelser og tilskudd | situasjonsavhengig | Helligdagsfred og lokale virksomhets- og arrangementssaker. |
| [Støtteprosessloven](https://lovdata.no/lov/2022-03-04-7) | Næring, tillatelser og tilskudd | generell | Kommunens behandling og oppfølging av offentlig næringsstøtte. |
| [Bilansvarslova](https://lovdata.no/lov/1961-02-03) | Tekniske tjenester og samferdsel | situasjonsavhengig | Ansvar og skadeoppgjør for kommunens motorvogner. |
| [Bredbåndsutbyggingsloven](https://lovdata.no/lov/2020-05-07-40) | Tekniske tjenester og samferdsel | generell | Kommunal infrastruktur, gravearbeider og samordning av bredbåndsutbygging. |
| [Ekomloven](https://lovdata.no/lov/2024-12-13-76) | Tekniske tjenester og samferdsel | situasjonsavhengig | Kommunalt drevne elektroniske kommunikasjonsnett eller tjenester der loven gjelder. |
| [El-tilsynsloven](https://lovdata.no/lov/1929-05-24-4) | Tekniske tjenester og samferdsel | generell | Elsikkerhet i kommunale bygg og tekniske anlegg. |
| [Energiloven](https://lovdata.no/lov/1990-06-29-50) | Tekniske tjenester og samferdsel | situasjonsavhengig | Energianlegg, fjernvarme og kommunale plan- og eierinteresser. |
| [Havne- og farvannsloven](https://lovdata.no/lov/2019-06-21-70) | Tekniske tjenester og samferdsel | generell | Kommunale havne- og farvannsoppgaver der kommunen har slike oppgaver. |
| [Lov om utleie av små elektriske kjøretøy på offentlig grunn](https://lovdata.no/lov/2021-06-18-139) | Tekniske tjenester og samferdsel | situasjonsavhengig | Kommunal regulering av utleie av små elektriske kjøretøy på offentlig grunn. |
| [Vannressursloven](https://lovdata.no/lov/2000-11-24-82) | Tekniske tjenester og samferdsel | generell | Vannressurser, vassdragstiltak og kommunal vannforvaltning. |
| [Vass- og avløpsanleggslova](https://lovdata.no/lov/2025-06-06-26) | Tekniske tjenester og samferdsel | generell | Kommunalt eierskap, levering og finansiering av vann- og avløpstjenester. |
| [Veglova](https://lovdata.no/lov/1963-06-21-23) | Tekniske tjenester og samferdsel | generell | Kommunen som veimyndighet og eier av kommunale veier. |
| [Vegtrafikkloven](https://lovdata.no/lov/1965-06-18-4) | Tekniske tjenester og samferdsel | generell | Trafikkregulering, parkering og bruk av kommunens kjøretøy. |
| [Aksjeloven](https://lovdata.no/lov/1997-06-13-44) | Økonomi, avtaler og eierskap | situasjonsavhengig | Eierstyring av kommunalt eide aksjeselskaper. |
| [Anskaffelsesloven](https://lovdata.no/lov/2016-06-17-73) | Økonomi, avtaler og eierskap | generell | Kommunale offentlige anskaffelser og leverandøroppfølging. |
| [Avtaleloven](https://lovdata.no/lov/1918-05-31-4) | Økonomi, avtaler og eierskap | generell | Kommunens avtaleinngåelse, fullmakter og kontraktsforvaltning. |
| [Bokføringsloven](https://lovdata.no/lov/2004-11-19-73) | Økonomi, avtaler og eierskap | situasjonsavhengig | Bokføringspliktige kommunale selskaper og aktiviteter. |
| [Dekningsloven](https://lovdata.no/lov/1984-06-08-59) | Økonomi, avtaler og eierskap | situasjonsavhengig | Kommunale krav i insolvens- og konkurssaker. |
| [Eigedomsskattelova](https://lovdata.no/lov/1975-06-06-29) | Økonomi, avtaler og eierskap | situasjonsavhengig | Kommunal eiendomsskatt der kommunen har innført ordningen. |
| [Enhetsregisterloven](https://lovdata.no/lov/2025-06-20-105) | Økonomi, avtaler og eierskap | generell | Registrering og vedlikehold av opplysninger om kommunen og relevante kommunale enheter. |
| [Foreldelsesloven](https://lovdata.no/lov/1979-05-18-18) | Økonomi, avtaler og eierskap | generell | Foreldelse av kommunale krav og erstatningssaker. |
| [Foretaksregisterloven](https://lovdata.no/lov/2025-06-20-106) | Økonomi, avtaler og eierskap | situasjonsavhengig | Registrering av kommunalt eide foretak som omfattes av foretaksregisterreglene. |
| [Forsikringsavtaleloven](https://lovdata.no/lov/1989-06-16-69) | Økonomi, avtaler og eierskap | generell | Forsikringsavtaler og skadeoppgjør i kommunal virksomhet. |
| [Forsinkelsesrenteloven](https://lovdata.no/lov/1976-12-17-100) | Økonomi, avtaler og eierskap | generell | Forsinkelsesrenter og håndtering av kommunale krav. |
| [IKS-loven](https://lovdata.no/lov/1999-01-29-6) | Økonomi, avtaler og eierskap | generell | Oppretting, styring og deltakelse i interkommunale selskaper. |
| [Inkassoloven](https://lovdata.no/lov/1988-05-13-26) | Økonomi, avtaler og eierskap | generell | Inndriving av kommunale krav og bruk av inkassotjenester. |
| [Kjøpsloven](https://lovdata.no/lov/1988-05-13-27) | Økonomi, avtaler og eierskap | generell | Kommunale varekjøp og kontraktsoppfølging. |
| [Konkurranseloven](https://lovdata.no/lov/2004-03-05-12) | Økonomi, avtaler og eierskap | situasjonsavhengig | Konkurranseregler ved kommunal økonomisk aktivitet. |
| [Konkursloven](https://lovdata.no/lov/1984-06-08-58) | Økonomi, avtaler og eierskap | situasjonsavhengig | Kommunen som kreditor eller kontraktspart ved konkurs. |
| [Kredittopplysningsloven](https://lovdata.no/lov/2019-12-20-109) | Økonomi, avtaler og eierskap | situasjonsavhengig | Bruk av kredittopplysninger i lovlige kommunale kreditt- og kontraktsvurderinger. |
| [Lov om register over reelle rettighetshavere](https://lovdata.no/lov/2019-03-01-2) | Økonomi, avtaler og eierskap | situasjonsavhengig | Registrering og opplysninger om reelle rettighetshavere i kommunalt eide foretak der loven gjelder. |
| [Merverdiavgiftskompensasjonsloven](https://lovdata.no/lov/2003-12-12-108) | Økonomi, avtaler og eierskap | generell | Kompensasjon for kommunal merverdiavgift. |
| [Merverdiavgiftsloven](https://lovdata.no/lov/2009-06-19-58) | Økonomi, avtaler og eierskap | generell | Merverdiavgift ved relevante kommunale aktiviteter. |
| [Regnskapsloven](https://lovdata.no/lov/1998-07-17-56) | Økonomi, avtaler og eierskap | situasjonsavhengig | Regnskapspliktige kommunale selskaper og aktiviteter; ikke en erstatning for kommunelovens regnskapsregler. |
| [Skadeserstatningsloven](https://lovdata.no/lov/1969-06-13-26) | Økonomi, avtaler og eierskap | generell | Kommunens erstatningsansvar og skadeoppgjør. |
| [Skattebetalingsloven](https://lovdata.no/lov/2005-06-17-67) | Økonomi, avtaler og eierskap | generell | Kommunale arbeidsgiverplikter ved skattetrekk og betaling. |
| [Skatteforvaltningsloven](https://lovdata.no/lov/2016-05-27-14) | Økonomi, avtaler og eierskap | situasjonsavhengig | Opplysningsplikter og skatteforvaltning der kommunale roller omfattes. |
| [Skatteloven](https://lovdata.no/lov/1999-03-26-14) | Økonomi, avtaler og eierskap | generell | Arbeidsgiverforhold og skattepliktige kommunale aktiviteter. |
| [Tvangsfullbyrdelsesloven](https://lovdata.no/lov/1992-06-26-86) | Økonomi, avtaler og eierskap | situasjonsavhengig | Tvangsinnkreving og fravikelse i konkrete kommunale kravs- og leiesaker. |
| [Åpenhetsloven](https://lovdata.no/lov/2021-06-18-99) | Økonomi, avtaler og eierskap | situasjonsavhengig | Aktsomhetsvurderinger i større kommunalt eide virksomheter som omfattes; gjelder ikke automatisk kommunen selv. |

Full gjennomgang av alle eksportdokumenter finnes i [vurderingslisten](municipal-national-laws-review.tsv). Det maskinlesbare utvalget ligger i [utvalgsfilen](../scripts/import-data/municipal-national-laws-2026-11-11.json).
