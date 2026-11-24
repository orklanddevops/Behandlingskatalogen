# Behandlingskatalogen codelist function

Azure Functions app for serving the country codelists currently read from NAV Kodeverk.

The backend currently expects NAV Kodeverk-compatible responses from:

```text
/api/v1/kodeverk/{code}/koder/betydninger?spraak=nb
```

The important codelists are:

- `Landkoder`
- `EEAFreg`

The stored JSON files live in `data/kodeverk`. They intentionally use the same `betydninger` shape as NAV Kodeverk, so the existing backend can switch by changing `CLIENT_COMMON_CODE_NAV_URL` to this function app base URL, including the `/api` prefix.

Example local backend value:

```text
CLIENT_COMMON_CODE_NAV_URL=http://localhost:7071/api
```

## Local Run

```bash
npm install
cp local.settings.example.json local.settings.json
npm start
```

## Routes

```text
GET /api/v1/kodeverk/Landkoder/koder/betydninger?spraak=nb
GET /api/v1/kodeverk/EEAFreg/koder/betydninger?spraak=nb
GET /api/codelist/countries
GET /api/codelist/countriesoutsideeea
GET /api/health
```

The `codelist/*` routes expose the mapped app-facing shape:

```json
[
  {
    "code": "NOR",
    "description": "NORGE",
    "validFrom": "1900-01-01",
    "validTo": "9999-12-31"
  }
]
```

The bundled data contains 249 ISO 3166-1 countries and territories in `Landkoder` and the 30 EU/EEA member countries in `EEAFreg`. The outside-EEA endpoint subtracts the latter from the former. Country identifiers come from the system `iso-codes` ISO 3166-1 dataset (https://salsa.debian.org/iso-codes-team/iso-codes); Norwegian display names were generated using Node.js `Intl.DisplayNames(['nb'], { type: 'region' })`. The date fields preserve the existing compatibility defaults; they are not membership or country establishment dates.

EEA membership was checked on 24 November 2026 against the [European Council's EEA overview](https://www.consilium.europa.eu/en/policies/eu-eea-relations/). Keep both lists up to date together when countries, codes or membership change. Restart the country service and backend after replacing the data to clear cached lists. VM deployments serve the same files through the codelists container.

