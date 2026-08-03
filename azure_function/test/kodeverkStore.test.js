const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clearCache,
  getAllCountries,
  getCountriesOutsideEea,
  mapKodeverkToCommonCodes,
} = require('../src/kodeverkStore');

test.afterEach(() => {
  clearCache();
});

test('maps NAV Kodeverk betydninger to app-facing common code response', () => {
  const response = mapKodeverkToCommonCodes({
    betydninger: {
      NOR: [
        {
          gyldigFra: '1900-01-01',
          gyldigTil: '9999-12-31',
          beskrivelser: {
            nb: {
              term: 'NORGE',
              tekst: 'NORGE',
            },
          },
        },
      ],
    },
  });

  assert.deepEqual(response, [
    {
      code: 'NOR',
      description: 'NORGE',
      validFrom: '1900-01-01',
      validTo: '9999-12-31',
    },
  ]);
});

test('reads all countries from Landkoder', async () => {
  assert.deepEqual(await getAllCountries(), [
    {
      code: 'NOR',
      description: 'NORGE',
      validFrom: '1900-01-01',
      validTo: '9999-12-31',
    },
  ]);
});

test('filters countries outside EEA like the backend service', async () => {
  assert.deepEqual(await getCountriesOutsideEea(), []);
});
