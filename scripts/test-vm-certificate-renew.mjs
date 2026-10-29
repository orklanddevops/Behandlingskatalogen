import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { checkRenewal, renewalWindow } from './vm-certificate-renew.mjs'
import { units } from './install-vm-certificate-timer.mjs'

const fixture = mkdtempSync(join(tmpdir(), 'bk-renew-fixture-'))
after(() => rmSync(fixture, { recursive: true, force: true }))
function issue(name, days) {
  const cert = join(fixture, name + '.pem')
  execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
    '-nodes', '-keyout', join(fixture, name + '.key'), '-out', cert, '-days', String(days),
    '-subj', '/CN=*.orkland.kommune.no'], { stdio: 'ignore' })
  return readFileSync(cert)
}
const old = issue('old', 14), replacement = issue('new', 40)
const expiry = Date.parse(new X509Certificate(old).validTo)
function harness(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bk-renew-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(join(dir, 'fullchain.pem'), old)
  const stateFile = join(dir, 'status.json'), calls = []
  return { dir, stateFile, calls, check(extra = {}) {
    return checkRenewal({ tlsDir: dir, stateFile, identityDir: '/not-read-by-test',
      login: () => { calls.push('login'); return {} },
      refresh: options => { calls.push(options); return { changed: false, version: 'old-version' } }, ...extra })
  } }
}
test('before the final week, records expiry without authentication or download', t => {
  const h = harness(t), state = h.check({ now: expiry - renewalWindow - 1 })
  assert.equal(state.result, 'not-due')
  assert.equal(state.expiresAt, new Date(expiry).toISOString())
  assert.equal(h.calls.length, 0)
  assert.equal(JSON.parse(readFileSync(h.stateFile)).expiresAt, state.expiresAt)
})
test('at seven days and on subsequent days, retries while the old version remains', t => {
  const h = harness(t)
  assert.equal(h.check({ now: expiry - renewalWindow }).result, 'waiting-for-new-version')
  assert.equal(h.check({ now: expiry - renewalWindow + 86400000 }).result, 'waiting-for-new-version')
  assert.equal(h.calls.filter(x => x === 'login').length, 2)
  assert.equal(h.calls[1].minimumExpiry, expiry)
  assert.equal(h.calls[1].reload, true)
  assert.deepEqual(readFileSync(join(h.dir, 'fullchain.pem')), old)
})
test('replacement expiry resets the window and further checks do not fetch', t => {
  const h = harness(t)
  const state = h.check({ now: expiry - 1000, refresh: () => {
    writeFileSync(join(h.dir, 'fullchain.pem'), replacement)
    return { changed: true, version: 'new-version' }
  } })
  assert.equal(state.result, 'renewed')
  assert.equal(state.expiresAt, new Date(new X509Certificate(replacement).validTo).toISOString())
  h.calls.length = 0
  assert.equal(h.check({ now: expiry }).result, 'not-due')
  assert.equal(h.calls.length, 0)
})
test('failed authentication retains the installed certificate and records failure', t => {
  const h = harness(t)
  assert.throws(() => h.check({ now: expiry - 1000, login: () => { throw new Error('offline') } }))
  assert.deepEqual(readFileSync(join(h.dir, 'fullchain.pem')), old)
  assert.equal(JSON.parse(readFileSync(h.stateFile)).result, 'failed')
  assert.equal(h.check({ now: expiry }).result, 'waiting-for-new-version')
})
test('timer and service unit files pass systemd validation', t => {
  const dir = mkdtempSync(join(tmpdir(), 'bk-unit-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const projectDir = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
  const content = units({ projectDir, nodePath: process.execPath, identityDir: '/home/administrator/.config/behandlingskatalogen' })
  assert.match(content.timer, /OnCalendar=daily/)
  assert.match(content.timer, /Persistent=true/)
  assert.match(content.service, /User=root/)
  assert.ok(!content.service.includes('keyvault-client-secret'))
  const service = join(dir, 'behandlingskatalogen-certificate.service'), timer = join(dir, 'behandlingskatalogen-certificate.timer')
  writeFileSync(service, content.service); writeFileSync(timer, content.timer)
  execFileSync('systemd-analyze', ['verify', service, timer], { stdio: ['ignore', 'pipe', 'pipe'] })
})
