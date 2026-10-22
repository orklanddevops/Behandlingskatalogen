import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildAuth, tenantId, publicUrl } from './vm-auth.mjs'

const clientId = '20777086-f460-4273-8c1f-8bc297e8ad07'
const decode = config => JSON.parse(config.services.backend.environment.SPRING_APPLICATION_JSON.replaceAll('$$', '$'))
test('Orkland identity replaces both local client placeholders and NAV discovery', () => {
  const settings = decode(buildAuth({ clientId, clientSecret: 'fixture-secret' }))
  assert.equal(settings['azure.activedirectory.client-id'], clientId)
  assert.equal(settings['azure.activedirectory.plain-client-id'], clientId)
  assert.equal(settings['azure.activedirectory.client-secret'], 'fixture-secret')
  assert.equal(settings['azure.activedirectory.plain-client-secret'], 'fixture-secret')
  assert.ok(settings['azure.activedirectory.well-known'].includes('/' + tenantId + '/'))
  assert.ok(settings['azure.activedirectory.openid-config-token-endpoint'].includes('/' + tenantId + '/'))
  assert.deepEqual(settings['polly.security.redirectUris'], [publicUrl + '/'])
  assert.equal(settings['polly.security.enabled'], true)
  assert.deepEqual(settings['polly.security.admin-groups'], [])
  assert.match(settings['polly.security.enc-key'], /^[0-9a-f]{64}$/)
})
test('invalid identity, missing secret and unsafe origins are refused', () => {
  assert.throws(() => buildAuth({ clientId: 'local-id', clientSecret: 'fixture' }))
  assert.throws(() => buildAuth({ clientId, clientSecret: '' }))
  assert.throws(() => buildAuth({ clientId, clientSecret: 'fixture', origin: 'http://example.no' }))
  assert.throws(() => buildAuth({ clientId, clientSecret: 'fixture', adminGroups: ['everyone'] }))
})
test('Compose preserves literal dollar signs and applies auth alongside the hostname settings', () => {
  const temp = mkdtempSync(join(tmpdir(), 'bk-auth-test-'))
  try {
    const override = join(temp, 'auth.json'), env = join(temp, 'env')
    const secret = 'fixture$PASSWORD${SUBSTITUTION}$$end'
    writeFileSync(override, JSON.stringify(buildAuth({ clientId, clientSecret: secret })))
    writeFileSync(env, 'POSTGRES_PASSWORD=fixture-only\n')
    const base = new URL('../compose.vm.yaml', import.meta.url).pathname
    const config = JSON.parse(execFileSync('docker', ['compose', '--env-file', env, '-f', base, '-f', override, 'config', '--format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
    const settings = JSON.parse(config.services.backend.environment.SPRING_APPLICATION_JSON)
    // Compose's config output escapes literal dollars again for round-trip use.
    assert.equal(settings['azure.activedirectory.client-secret'].replaceAll('$$', '$'), secret)
    assert.equal(settings['polly.security.enabled'], true)
    assert.equal(config.services.backend.environment.SERVER_FORWARD_HEADERS_STRATEGY, 'framework')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})
