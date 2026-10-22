import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let port = '3000'
try {
  const config = readFileSync(new URL('../.env.vm', import.meta.url), 'utf8')
  port = config.match(/^VM_PORT=(\d+)\s*$/m)?.[1] || port
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const base = process.env.VM_URL || `http://127.0.0.1:${port}`
const emptyPage = (data) => {
  assert.ok(Array.isArray(data.content), 'Expected a paged response')
  assert.equal(data.content.length, 0, 'Expected the offline fallback to return no results')
}
const checks = [
  ['frontend page and Orkland branding', '/', (data) => {
    assert.match(data, /<html/i)
    assert.match(data, /polly-mainsearch__control/, 'Expected themed search control')
    assert.ok(/Orkland kommunes behandlingskatalog/.test(data), 'Expected the Orkland homepage introduction')
    assert.ok(!/(?:https?:)?\/\/[^\s"'<>]*(?:nav\.no|navno\.sharepoint|navikt\.github|slack\.com)|slack:\/\//i.test(data))
  }, 'text'],
  ['Orkland guide', '/veileder', (data) => assert.match(data, /Veileder for Orkland kommune/), 'text'],
  ['Orkland logo', '/orkland-kommune-logo.svg', (data) => assert.match(data, /<svg\b/), 'text'],
  ['Orkland light logo', '/orkland-kommune-logo-light.svg', (data) => {
    assert.match(data, /<svg\b/)
    assert.match(data, /fill:#20392D/)
  }, 'text'],
  ['Orkland browser metadata', '/manifest.json', (data) => {
    assert.equal(data.name, 'Orkland kommunes behandlingskatalog')
    assert.equal(data.theme_color, '#DDEBD7')
  }],
  ['Orkland codelist wording', '/api/codelist/GDPR_ARTICLE/ART61C', (data) => {
    assert.match(data.description, /Orkland kommune er underlagt/)
    assert.ok(!/\bNAV\b/.test(data.description))
  }],
  ['backend and database health', '/api/internal/health', (data) => {
    assert.equal(data.status, 'UP')
    assert.equal(data.components?.db?.status, 'UP')
  }],
  ['development user permissions', '/api/userinfo', (data) => {
    assert.ok(data.groups.includes('WRITE'))
    assert.ok(data.groups.includes('ADMIN'))
  }],
  ['dashboard without external organisation lookup', '/api/dash?filter=ALL', (data) => {
    assert.ok(data && typeof data === 'object')
  }],
  ['country codelist', '/api/codelist/countries', (data) => {
    assert.ok(Array.isArray(data))
    assert.ok(data.some((country) => country.code === 'NOR'))
  }],
  ['countries outside EEA', '/api/codelist/countriesoutsideeea', (data) => {
    assert.ok(Array.isArray(data))
    assert.ok(!data.some((country) => country.code === 'NOR'))
  }],
  ['offline teams', '/api/team', emptyPage],
  ['offline product areas', '/api/team/productarea', emptyPage],
  ['offline resources', '/api/team/resource/search/smoke', emptyPage],
  ['offline term search', '/api/term/search/smoke', emptyPage],
]
let failures = 0
for (const [name, path, verify, format] of checks) {
  try {
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) })
    assert.equal(response.status, 200, `HTTP ${response.status} for ${path}`)
    const data = format === 'text' ? await response.text() : await response.json()
    verify(data)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures++
    console.error(`FAIL ${name}: ${error.message}`)
  }
}
console.log(`${checks.length - failures}/${checks.length} live deployment checks passed (${base}).`)
process.exitCode = failures ? 1 : 0
