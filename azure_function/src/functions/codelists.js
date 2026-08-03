const { app } = require('@azure/functions');
const {
  getAllCountries,
  getCountriesOutsideEea,
  getKodeverk,
  listKodeverkNames,
} = require('../kodeverkStore');

const cacheControl = process.env.CACHE_CONTROL || 'public, max-age=3600';

function json(status, body, extraHeaders = {}) {
  return {
    status,
    jsonBody: body,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  };
}

async function kodeverkBetydninger(request, context) {
  const code = request.params.code;

  try {
    const response = await getKodeverk(code);
    return json(200, response);
  } catch (error) {
    if (error.code === 'UNKNOWN_KODEVERK') {
      return json(404, {
        error: 'Unknown kodeverk',
        code,
        available: await listKodeverkNames(),
      });
    }

    context.error(error);
    return json(500, { error: 'Failed to read kodeverk' });
  }
}

async function countries(request, context) {
  try {
    return json(200, await getAllCountries(request.query.get('spraak') || 'nb'));
  } catch (error) {
    context.error(error);
    return json(500, { error: 'Failed to read countries' });
  }
}

async function countriesOutsideEea(request, context) {
  try {
    return json(200, await getCountriesOutsideEea(request.query.get('spraak') || 'nb'));
  } catch (error) {
    context.error(error);
    return json(500, { error: 'Failed to read countries outside EEA' });
  }
}

async function health() {
  return json(200, { status: 'ok' }, { 'Cache-Control': 'no-store' });
}

app.http('kodeverkBetydninger', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'v1/kodeverk/{code}/koder/betydninger',
  handler: kodeverkBetydninger,
});

app.http('countries', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'codelist/countries',
  handler: countries,
});

app.http('countriesOutsideEea', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'codelist/countriesoutsideeea',
  handler: countriesOutsideEea,
});

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});

