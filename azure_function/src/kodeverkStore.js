const fs = require('node:fs/promises');
const path = require('node:path');

const dataDir = process.env.CODELIST_DATA_DIR || path.join(__dirname, '..', 'data', 'kodeverk');
const kodeverkNamePattern = /^[A-Za-z0-9_-]+$/;
const outsideEeaCodePattern = /^[A-Z]{3}$/;
const outsideEeaIgnoredCodes = new Set(['XXX']);
const cache = new Map();

function normalizeKodeverkName(name) {
  if (!name || !kodeverkNamePattern.test(name)) {
    const error = new Error(`Invalid kodeverk name: ${name}`);
    error.code = 'INVALID_KODEVERK';
    throw error;
  }
  return name;
}

async function readKodeverk(name) {
  const normalized = normalizeKodeverkName(name);

  if (cache.has(normalized)) {
    return cache.get(normalized);
  }

  const filePath = path.join(dataDir, `${normalized}.json`);

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      const unknown = new Error(`Unknown kodeverk: ${normalized}`);
      unknown.code = 'UNKNOWN_KODEVERK';
      throw unknown;
    }
    throw error;
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.betydninger !== 'object' || Array.isArray(parsed.betydninger)) {
    throw new Error(`Kodeverk ${normalized} must contain a betydninger object`);
  }

  cache.set(normalized, parsed);
  return parsed;
}

async function listKodeverkNames() {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name.slice(0, -'.json'.length))
    .sort();
}

async function getKodeverk(name) {
  return readKodeverk(name);
}

function descriptionFor(meaning, language) {
  const descriptions = meaning.beskrivelser || {};
  const preferred = descriptions[language] || descriptions.nb || Object.values(descriptions)[0];
  return preferred?.tekst || preferred?.term;
}

function mapKodeverkToCommonCodes(kodeverk, language = 'nb') {
  return Object.entries(kodeverk.betydninger)
    .map(([code, meanings]) => {
      if (!Array.isArray(meanings) || meanings.length === 0) {
        return null;
      }

      const meaning = meanings[0];
      const description = descriptionFor(meaning, language);
      if (!description) {
        return null;
      }

      return {
        code,
        description,
        validFrom: meaning.gyldigFra,
        validTo: meaning.gyldigTil,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.code.localeCompare(right.code));
}

async function getAllCountries(language = 'nb') {
  return mapKodeverkToCommonCodes(await readKodeverk('Landkoder'), language);
}

async function getCountriesOutsideEea(language = 'nb') {
  const [countries, eeaCountries] = await Promise.all([
    getAllCountries(language),
    mapKodeverkToCommonCodes(await readKodeverk('EEAFreg'), language),
  ]);

  const eeaCountryCodes = new Set(eeaCountries.map((country) => country.code));
  return countries.filter(
    (country) =>
      !eeaCountryCodes.has(country.code) &&
      !outsideEeaIgnoredCodes.has(country.code) &&
      outsideEeaCodePattern.test(country.code)
  );
}

function clearCache() {
  cache.clear();
}

module.exports = {
  clearCache,
  getAllCountries,
  getCountriesOutsideEea,
  getKodeverk,
  listKodeverkNames,
  mapKodeverkToCommonCodes,
};

