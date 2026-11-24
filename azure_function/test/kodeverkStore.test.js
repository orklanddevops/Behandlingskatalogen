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

test('provides international country choices with Norwegian names', async () => {
  const countries = await getAllCountries();
  assert.equal(countries.length, 249);
  assert.equal(new Set(countries.map(country => country.code)).size, countries.length);
  for (const [code, description] of [['NOR', 'Norge'], ['USA', 'USA'], ['GBR', 'Storbritannia'], ['DEU', 'Tyskland']]) {
    assert.equal(countries.find(country => country.code === code)?.description, description);
  }
  assert.ok(countries.every(country => /^[A-Z]{3}$/.test(country.code) && country.description));
});

test('excludes all EEA members while retaining countries outside EEA', async () => {
  const countries = await getCountriesOutsideEea();
  const codes = new Set(countries.map(country => country.code));
  const eeaCodes = 'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE ISL LIE NOR'.split(' ');
  for (const code of eeaCodes) assert.ok(!codes.has(code), `${code} must be excluded`);
  for (const code of ['USA', 'GBR', 'CHE', 'IND', 'CAN']) assert.ok(codes.has(code), `${code} must be selectable`);
  assert.equal(countries.length, 249 - eeaCodes.length);
});
