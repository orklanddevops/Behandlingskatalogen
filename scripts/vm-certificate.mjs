import { execFileSync } from 'node:child_process'
import { X509Certificate, createPrivateKey } from 'node:crypto'
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const certificateUrl = 'https://stjernecert.vault.azure.net/certificates/stjerne-orkland-kommune-no-2026'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(file, args) {
  try {
    return execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024, timeout: 120000 })
  } catch {
    // Do not include captured output: Azure responses can contain private keys.
    throw new Error(`${file} failed. Check installation, authentication, permissions, and certificate format.`)
  }
}

export function certificateIdentity(value) {
  const url = new URL(value)
  const parts = url.pathname.split('/').filter(Boolean)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
      !/^[a-z0-9-]+\.vault\.azure\.net$/.test(url.hostname) || parts[0] !== 'certificates' ||
      !/^[a-zA-Z0-9-]+$/.test(parts[1] || '') || ![2, 3].includes(parts.length)) {
    throw new Error('Expected an Azure Key Vault certificate URL.')
  }
  // Intentionally ignore any version supplied in the input URL.
  return { vault: url.hostname.split('.')[0], host: url.hostname, name: parts[1] }
}

export function refreshCertificate({ url = certificateUrl, tlsDir = join(root, '.vm-tls'),
  hostname = 'behandlingskatalogen.orkland.kommune.no', reload = false, execute = run } = {}) {
  const identity = certificateIdentity(url)
  tlsDir = resolve(tlsDir)
  mkdirSync(tlsDir, { recursive: true, mode: 0o700 })
  const lock = join(tlsDir, '.certificate-refresh.lock')
  try {
    mkdirSync(lock, { mode: 0o700 })
  } catch {
    throw new Error('Certificate refresh is locked. If no refresh is running, remove .certificate-refresh.lock from the TLS directory.')
  }
  let stage
  try {
    stage = mkdtempSync(join(tlsDir, '.certificate-'))
    chmodSync(stage, 0o700)
    // No --version: always resolve the latest certificate, then fetch its exact backing secret.
    const metadata = JSON.parse(execute('az', ['keyvault', 'certificate', 'show', '--vault-name', identity.vault,
      '--name', identity.name, '--output', 'json', '--only-show-errors']))
    if (metadata.attributes?.enabled === false) throw new Error('The latest certificate is disabled.')
    const secretUrl = new URL(metadata.sid)
    const parts = secretUrl.pathname.split('/').filter(Boolean)
    if (secretUrl.protocol !== 'https:' || secretUrl.host !== identity.host || secretUrl.username ||
        secretUrl.password || secretUrl.search || secretUrl.hash || parts.length !== 3 ||
        parts[0] !== 'secrets' || parts[1] !== identity.name || !/^[a-zA-Z0-9-]+$/.test(parts[2])) {
      throw new Error('The certificate backing secret does not match the expected vault and certificate.')
    }
    const secret = JSON.parse(execute('az', ['keyvault', 'secret', 'show', '--id', metadata.sid,
      '--output', 'json', '--only-show-errors']))
    if (secret.attributes?.enabled === false || typeof secret.value !== 'string') {
      throw new Error('The certificate backing secret is unavailable or disabled.')
    }
    let bundle
    if (secret.contentType === 'application/x-pem-file') {
      bundle = secret.value
    } else if (secret.contentType === 'application/x-pkcs12') {
      const pfx = join(stage, 'certificate.pfx')
      const pem = join(stage, 'bundle.pem')
      writeFileSync(pfx, Buffer.from(secret.value, 'base64'), { mode: 0o600 })
      execute('openssl', ['pkcs12', '-in', pfx, '-passin', 'pass:', '-nodes', '-out', pem])
      bundle = readFileSync(pem, 'utf8')
    } else {
      throw new Error('The certificate secret must be PFX or PEM with an exportable private key.')
    }
    let key
    try { key = createPrivateKey(bundle) } catch {
      throw new Error('The certificate secret does not contain a usable, unencrypted private key.')
    }
    const certificates = [...new Set(bundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [])]
    const leafIndex = certificates.findIndex(pem => new X509Certificate(pem).checkPrivateKey(key))
    if (leafIndex < 0) throw new Error('No certificate matches the downloaded private key.')
    const [leaf] = certificates.splice(leafIndex, 1)
    const cert = new X509Certificate(leaf)
    if (!cert.checkHost(hostname)) throw new Error('The certificate does not cover the application hostname.')
    if (Date.now() < Date.parse(cert.validFrom) || Date.now() >= Date.parse(cert.validTo)) {
      throw new Error('The certificate is expired or not yet valid.')
    }
    const files = {
      'fullchain.pem': [leaf, ...certificates].join('\n') + '\n',
      'privkey.pem': key.export({ type: 'pkcs8', format: 'pem' }),
    }
    const previous = new Map()
    for (const [name, value] of Object.entries(files)) {
      const destination = join(tlsDir, name)
      let stat
      try { stat = lstatSync(destination) } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (stat) {
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('TLS destinations must be regular files.')
        previous.set(name, { value: readFileSync(destination), mode: stat.mode & 0o777 })
      }
      writeFileSync(join(stage, name), value, { mode: 0o600 })
    }
    const changed = Object.entries(files).some(([name, value]) =>
      !previous.has(name) || !previous.get(name).value.equals(Buffer.from(value)))
    if (!changed) return { changed: false, version: parts[2] }
    // Nginx keeps its current certificate in memory until the explicit reload.
    const installed = []
    try {
      for (const name of Object.keys(files)) {
        renameSync(join(stage, name), join(tlsDir, name))
        installed.push(name)
      }
      if (reload) execute('bash', [join(root, 'scripts/vm.sh'), 'reload-https'])
    } catch (error) {
      for (const name of installed) {
        if (previous.has(name)) {
          const old = previous.get(name)
          writeFileSync(join(stage, name), old.value, { mode: old.mode })
          renameSync(join(stage, name), join(tlsDir, name))
        } else rmSync(join(tlsDir, name), { force: true })
      }
      throw error
    }
    return { changed: true, version: parts[2] }
  } finally {
    if (stage) rmSync(stage, { recursive: true, force: true })
    rmSync(lock, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {}
    const args = process.argv.slice(2)
    while (args.length) {
      const arg = args.shift()
      if (arg === '--reload') options.reload = true
      else if (['--certificate-url', '--tls-dir', '--hostname'].includes(arg) && args[0] && !args[0].startsWith('--')) {
        options[{ '--certificate-url': 'url', '--tls-dir': 'tlsDir', '--hostname': 'hostname' }[arg]] = args.shift()
      } else throw new Error('Usage: node scripts/vm-certificate.mjs [--certificate-url URL] [--tls-dir DIR] [--hostname NAME] [--reload]')
    }
    const result = refreshCertificate(options)
    console.log(result.changed ? `Installed certificate version ${result.version}.` : `Certificate version ${result.version} is already installed.`)
    if (!options.reload && result.changed) console.log('Deploy or reload the HTTPS gateway to activate it.')
  } catch (error) {
    console.error(`Certificate refresh failed: ${error.message}`)
    process.exitCode = 1
  }
}
