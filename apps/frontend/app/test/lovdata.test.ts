import { getLovdataUrl } from '../util/lovdata'

jest.mock('../util/env', () => ({ env: {} }))

test('canonical Kode identifies the law independently of its readable description', () => {
  expect(getLovdataUrl('LOV_2025_06_20_107', 'Regulerer leting og utvinning av mineraler.')).toBe(
    'https://lovdata.no/lov/2025-06-20-107'
  )
  expect(getLovdataUrl('LOV_2025_06_20_107', '1997-02-28-19')).toBe(
    'https://lovdata.no/lov/2025-06-20-107'
  )
  expect(getLovdataUrl('LOV_1814_05_17')).toBe('https://lovdata.no/lov/1814-05-17')
})

test.each([
  '1997-02-28-19',
  'LOV-1997-02-28-19',
  'https://lovdata.no/lov/1997-02-28-19/',
  'https://lovdata.no/dokument/NL/lov/1997-02-28-19',
])('legacy short codes still link using reference %s', (reference) => {
  expect(getLovdataUrl('FTRL', reference)).toBe('https://lovdata.no/lov/1997-02-28-19')
})

test('regulations use the regulation URL for both canonical and legacy codes', () => {
  expect(getLovdataUrl('FORSKRIFT_2026_06_12_1092', 'Readable summary')).toBe(
    'https://lovdata.no/forskrift/2026-06-12-1092'
  )
  expect(getLovdataUrl('FORSKRIFT_TEST', '2026-06-12-1092')).toBe(
    'https://lovdata.no/forskrift/2026-06-12-1092'
  )
})

test('descriptions, invalid identifiers and unrelated URLs cannot become broken or arbitrary links', () => {
  expect(getLovdataUrl('UNKNOWN', 'Regulerer kommunens virksomhet.')).toBeUndefined()
  expect(getLovdataUrl('LOV_2025_02_30_1')).toBeUndefined()
  expect(getLovdataUrl('UNKNOWN', 'https://example.org/lov/2025-06-20-107')).toBeUndefined()
  expect(getLovdataUrl('UNKNOWN', '2025-06-20-107 gjelder mineraler')).toBeUndefined()
})
