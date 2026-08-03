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

The initial data intentionally contains only Norway. Keep `NOR` in both `Landkoder` and `EEAFreg`; that makes `/api/codelist/countriesoutsideeea` return an empty list until additional non-EEA countries are added.

