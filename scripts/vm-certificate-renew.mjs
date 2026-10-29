import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshCertificate } from './vm-certificate.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const renewalWindow = 7 * 24 * 60 * 60 * 1000
function run(command, args, env = process.env) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', env,
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
  } catch {
    throw new Error(`${command} failed; check service credentials, network access, and service logs.`)
  }
}
export function authenticate(identityDir, cacheDir) {
  const values = Object.fromEntries(readFileSync(join(identityDir, 'identifiers.env'), 'utf8').split(/\r?\n/)
    .filter(Boolean).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
  if (!/^[a-f0-9-]{36}$/i.test(values.BK_VAULT_APP || '')) throw new Error('Invalid Key Vault client ID.')
  const secret = readFileSync(join(identityDir, 'keyvault-client-secret'), 'utf8').trim()
  if (!secret) throw new Error('Missing Key Vault client secret.')
  const env = { ...process.env, AZURE_CONFIG_DIR: cacheDir }
  run('az', ['login', '--service-principal', '--username', values.BK_VAULT_APP,
    '--password=' + secret, '--tenant', '91d14ddc-e451-4a63-83a5-7c9dc6335632',
    '--skip-subscription-discovery', '--allow-no-subscriptions', '--output', 'none', '--only-show-errors'], env)
  return env
}
function installedCertificate(tlsDir) {
  try { return new X509Certificate(readFileSync(join(tlsDir, 'fullchain.pem'))) } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error('Cannot read the installed HTTPS certificate.')
  }
}
function saveState(file, state) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  const staging = file + '.tmp'
  writeFileSync(staging, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
  renameSync(staging, file)
}
export function checkRenewal({ tlsDir, identityDir, stateFile, now = Date.now(),
  login = authenticate, refresh = refreshCertificate } = {}) {
  const cert = installedCertificate(tlsDir)
  const expiry = cert ? Date.parse(cert.validTo) : null
  const due = expiry === null || expiry - now <= renewalWindow
  const state = { checkedAt: new Date(now).toISOString(), expiresAt: expiry === null ? null : new Date(expiry).toISOString(),
    fingerprint: cert?.fingerprint256 || null, renewalStartsAt: expiry === null ? null : new Date(expiry - renewalWindow).toISOString(),
    result: due ? 'checking-key-vault' : 'not-due' }
  saveState(stateFile, state)
  if (!due) return state
  try {
    const env = login(identityDir, join(dirname(stateFile), 'azure'))
    const result = refresh({ tlsDir, reload: true, minimumExpiry: expiry,
      execute: (command, args) => run(command, args, env) })
    const installed = installedCertificate(tlsDir)
    state.expiresAt = installed ? new Date(installed.validTo).toISOString() : null
    state.fingerprint = installed?.fingerprint256 || null
    state.renewalStartsAt = installed ? new Date(Date.parse(installed.validTo) - renewalWindow).toISOString() : null
    state.result = result.changed ? 'renewed' : 'waiting-for-new-version'
    state.version = result.version
    state.lastAttemptAt = state.checkedAt
    saveState(stateFile, state)
    return state
  } catch {
    state.result = 'failed'
    state.lastAttemptAt = state.checkedAt
    saveState(stateFile, state)
    throw new Error('Certificate renewal failed. Existing certificate retained; the timer will retry on its next run. Check identity credentials, Key Vault, and network access.')
  }
}
export function configuredTlsDir() {
  const args = ['compose', '--project-name', 'behandlingskatalogen-vm', '--env-file', join(root, '.env.vm'), '-f', join(root, 'compose.vm.yaml')]
  if (existsSync(join(root, '.vm-auth.compose.json'))) args.push('-f', join(root, '.vm-auth.compose.json'))
  args.push('--profile', 'https', 'config', '--format', 'json')
  const config = JSON.parse(run('docker', args))
  return config.services.https.volumes.find(v => v.target === '/etc/nginx/tls').source
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = { identityDir: join(homedir(), '.config/behandlingskatalogen'), stateFile: join(root, '.vm-certificate-renewal/status.json') }
    const args = process.argv.slice(2)
    while (args.length) {
      const arg = args.shift(), value = args.shift()
      if (!value || !['--identity-dir', '--tls-dir', '--state-file'].includes(arg)) throw new Error('Invalid renewal options.')
      options[{ '--identity-dir': 'identityDir', '--tls-dir': 'tlsDir', '--state-file': 'stateFile' }[arg]] = resolve(value)
    }
    options.tlsDir ||= configuredTlsDir()
    const result = checkRenewal(options)
    console.log(`Certificate expiry: ${result.expiresAt || 'not installed'}; renewal status: ${result.result}.`)
    if (result.result === 'waiting-for-new-version') console.log('Key Vault still has the installed certificate; retrying on the next daily timer run.')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
