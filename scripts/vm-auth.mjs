import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const tenantId = '91d14ddc-e451-4a63-83a5-7c9dc6335632'
export const publicUrl = 'https://digikatalogen.orkland.kommune.no'
const guid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function buildAuth({ clientId, clientSecret, tenant = tenantId, origin = publicUrl,
  encryptionKey = randomBytes(32).toString('hex'), writeGroups = [], superGroups = [], adminGroups = [] }) {
  if (!guid.test(clientId) || !guid.test(tenant)) throw new Error('Client and tenant IDs must be GUIDs.')
  if (!clientSecret || !/^[a-f0-9]{64}$/i.test(encryptionKey)) throw new Error('Missing client secret or invalid session encryption key.')
  const url = new URL(origin)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('The public URL must be an HTTPS origin without a path.')
  }
  for (const groups of [writeGroups, superGroups, adminGroups]) {
    if (!Array.isArray(groups) || groups.some(id => !guid.test(id))) throw new Error('Group IDs must be GUIDs.')
  }
  const authority = 'https://login.microsoftonline.com/' + tenant
  const settings = {
    'azure.activedirectory.well-known': authority + '/v2.0/.well-known/openid-configuration',
    'azure.activedirectory.client-id': clientId,
    'azure.activedirectory.plain-client-id': clientId,
    'azure.activedirectory.client-secret': clientSecret,
    'azure.activedirectory.plain-client-secret': clientSecret,
    'azure.activedirectory.openid-config-token-endpoint': authority + '/oauth2/v2.0/token',
    'polly.security.enabled': true,
    'polly.security.client.enabled': false,
    'polly.security.enc-key': encryptionKey,
    'polly.security.redirectUris': [url.origin + '/'],
    'polly.security.write-groups': writeGroups,
    'polly.security.super-groups': superGroups,
    'polly.security.admin-groups': adminGroups,
    'server.forward-headers-strategy': 'framework',
    'logging.level.org.springframework.web.cors.DefaultCorsProcessor': 'DEBUG',
  }
  // Compose expands dollar signs even inside JSON values; preserve literal secrets.
  return { services: { backend: { environment: {
    SPRING_APPLICATION_JSON: JSON.stringify(settings).replaceAll('$', () => '$$'),
  } } } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const identityDir = join(homedir(), '.config/behandlingskatalogen')
    let output = join(identityDir, 'vm-auth.compose.json')
    const groups = { writeGroups: [], superGroups: [], adminGroups: [] }
    const args = process.argv.slice(2)
    while (args.length) {
      const flag = args.shift(), value = args.shift()
      if (!value) throw new Error('Missing option value.')
      if (flag === '--output') output = resolve(value)
      else if (flag === '--write-group') groups.writeGroups.push(value)
      else if (flag === '--super-group') groups.superGroups.push(value)
      else if (flag === '--admin-group') groups.adminGroups.push(value)
      else throw new Error('Unknown option.')
    }
    const ids = Object.fromEntries(readFileSync(join(identityDir, 'identifiers.env'), 'utf8').split(/\r?\n/)
      .filter(Boolean).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)] }))
    if (ids.BK_SIGNIN_APP === ids.BK_VAULT_APP) throw new Error('Sign-in and Key Vault apps must be separate.')
    let encryptionKey
    if (existsSync(output)) {
      const old = JSON.parse(readFileSync(output, 'utf8')).services.backend.environment.SPRING_APPLICATION_JSON
      encryptionKey = JSON.parse(old.replaceAll('$$', '$'))['polly.security.enc-key']
    }
    const config = buildAuth({ clientId: ids.BK_SIGNIN_APP,
      clientSecret: readFileSync(join(identityDir, 'signin-client-secret'), 'utf8').trim(), encryptionKey, ...groups })
    mkdirSync(dirname(output), { recursive: true, mode: 0o700 })
    writeFileSync(output, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
    chmodSync(output, 0o600)
    console.log('Saved protected sign-in configuration: ' + output)
    console.log('Tenant: ' + tenantId + '; public URL: ' + publicUrl)
    console.log('WRITE/SUPER/ADMIN require explicit group mappings; otherwise only existing READ access is available.')
  } catch {
    console.error('Could not prepare sign-in configuration. Check protected identity files, options, and output permissions. Secret values are never printed.')
    process.exitCode = 1
  }
}
