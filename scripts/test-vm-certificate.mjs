import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createPrivateKey } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { certificateIdentity, certificateUrl, refreshCertificate } from './vm-certificate.mjs'

const fixture = mkdtempSync(join(tmpdir(), 'vm-cert-fixture-'))
after(() => rmSync(fixture, { recursive: true, force: true }))
function issue(name, host) {
  const key = join(fixture, `${name}.key`)
  const cert = join(fixture, `${name}.crt`)
  execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
    '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${host}`,
    '-addext', `subjectAltName=DNS:${host}`], { stdio: 'ignore' })
  return { key, cert, pem: readFileSync(cert, 'utf8') + readFileSync(key, 'utf8') }
}
const first = issue('first', '*.orkland.kommune.no')
const second = issue('second', '*.orkland.kommune.no')
const wrongHost = issue('wrong-host', 'other.example.no')

function harness(t) {
  const tlsDir = mkdtempSync(join(tmpdir(), 'vm-cert-test-'))
  t.after(() => rmSync(tlsDir, { recursive: true, force: true }))
  const state = { version: 'v1', pem: first.pem, calls: [], type: 'application/x-pem-file' }
  const execute = (command, args) => {
    state.calls.push([command, ...args])
    if (command === 'az' && args[1] === 'certificate') {
      if (state.failFetch) throw new Error('Access denied')
      return JSON.stringify({ sid: `https://stjernecert.vault.azure.net/secrets/${state.otherSecret || 'stjerne-orkland-kommune-no-2026'}/${state.version}`,
        attributes: { enabled: !state.disabled } })
    }
    if (command === 'az' && args[1] === 'secret') {
      return JSON.stringify({ contentType: state.type, value: state.pem })
    }
    if (command === 'bash') {
      if (state.failReload) throw new Error('Nginx validation failed')
      return ''
    }
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  const refresh = (extra = {}) => refreshCertificate({ tlsDir, execute, ...extra })
  const snapshot = () => ['fullchain.pem', 'privkey.pem'].map(name => readFileSync(join(tlsDir, name), 'utf8'))
  return { tlsDir, state, refresh, snapshot }
}

test('a supplied version URL resolves by vault and name, never pins that version', () => {
  assert.deepEqual(certificateIdentity(`${certificateUrl}/0101b306f9b24d9dbc0c27faf7833364`),
    { vault: 'stjernecert', host: 'stjernecert.vault.azure.net', name: 'stjerne-orkland-kommune-no-2026' })
  assert.throws(() => certificateIdentity('https://attacker.example/certificates/name'))
})

test('renewal installs the new version without configuration changes and reloads only on change', t => {
  const h = harness(t)
  assert.equal(h.refresh({ url: `${certificateUrl}/old-version`, reload: true }).version, 'v1')
  const old = h.snapshot()
  h.state.version = 'v2'
  h.state.pem = second.pem
  assert.deepEqual(h.refresh({ reload: true }), { version: 'v2', changed: true })
  assert.notDeepEqual(h.snapshot(), old)
  assert.equal(h.refresh({ reload: true }).changed, false)
  assert.equal(h.state.calls.filter(c => c[0] === 'bash').length, 2)
  const lookups = h.state.calls.filter(c => c[0] === 'az' && c[2] === 'certificate')
  assert.ok(lookups.every(c => !c.includes('--version') && !c.includes('--id')))
  const secrets = h.state.calls.filter(c => c[0] === 'az' && c[2] === 'secret')
  assert.ok(secrets[0].some(a => a.endsWith('/v1')))
  assert.ok(secrets[1].some(a => a.endsWith('/v2')))
  assert.equal(statSync(join(h.tlsDir, 'privkey.pem')).mode & 0o777, 0o600)
  assert.deepEqual(readdirSync(h.tlsDir).sort(), ['fullchain.pem', 'privkey.pem'])
})

test('Key Vault PFX is extracted into a usable certificate and private key', t => {
  const h = harness(t)
  const pfx = execFileSync('openssl', ['pkcs12', '-export', '-inkey', first.key, '-in', first.cert, '-passout', 'pass:'])
  h.state.type = 'application/x-pkcs12'
  h.state.pem = pfx.toString('base64')
  assert.equal(h.refresh().changed, true)
  assert.ok(createPrivateKey(readFileSync(join(h.tlsDir, 'privkey.pem'))))
})

for (const [name, change] of [
  ['failed download', s => { s.failFetch = true }],
  ['disabled latest certificate', s => { s.disabled = true }],
  ['wrong hostname', s => { s.pem = wrongHost.pem }],
  ['missing exportable private key', s => { s.pem = readFileSync(first.cert, 'utf8') }],
  ['mismatched key', s => { s.pem = readFileSync(first.cert, 'utf8') + readFileSync(second.key, 'utf8') }],
  ['unexpected backing secret', s => { s.otherSecret = 'unrelated-secret' }],
  ['reload failure', s => { s.pem = second.pem; s.failReload = true }],
]) {
  test(`${name} preserves the installed certificate and key`, t => {
    const h = harness(t)
    h.refresh()
    const old = h.snapshot()
    change(h.state)
    assert.throws(() => h.refresh({ reload: true }))
    assert.deepEqual(h.snapshot(), old)
    assert.deepEqual(readdirSync(h.tlsDir).sort(), ['fullchain.pem', 'privkey.pem'])
  })
}

test('failed initial reload leaves no partially installed certificate', t => {
  const h = harness(t)
  h.state.failReload = true
  assert.throws(() => h.refresh({ reload: true }))
  assert.equal(existsSync(join(h.tlsDir, 'fullchain.pem')), false)
  assert.equal(existsSync(join(h.tlsDir, 'privkey.pem')), false)
})
