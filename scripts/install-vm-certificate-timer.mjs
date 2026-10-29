import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function units({ projectDir, nodePath, identityDir }) {
  const quote = value => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%') + '"'
  if ([projectDir, nodePath, identityDir].some(x => /[\r\n\0]/.test(x))) throw new Error('Invalid service path.')
  return {
    service: `[Unit]
Description=Check and renew Digikatalogen HTTPS certificate
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=${projectDir.replaceAll('%', '%%')}
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=${quote(nodePath)} ${quote(join(projectDir, 'scripts/vm-certificate-renew.mjs'))} --identity-dir ${quote(identityDir)} --state-file /var/lib/behandlingskatalogen-certificate/status.json
StateDirectory=behandlingskatalogen-certificate
StateDirectoryMode=0700
UMask=0077
TimeoutStartSec=15min
`,
    timer: `[Unit]
Description=Daily Digikatalogen certificate expiry check

[Timer]
OnBootSec=2min
OnCalendar=daily
RandomizedDelaySec=15min
Persistent=true
Unit=behandlingskatalogen-certificate.service

[Install]
WantedBy=timers.target
`,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.platform !== 'linux' || process.getuid() !== 0) throw new Error('Run this installer with sudo on the Ubuntu VM.')
    if (process.argv.length !== 4 || process.argv[2] !== '--identity-dir') throw new Error('Usage: sudo node scripts/install-vm-certificate-timer.mjs --identity-dir /home/USER/.config/behandlingskatalogen')
    const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..'), identityDir = resolve(process.argv[3])
    for (const file of ['identifiers.env', 'keyvault-client-secret']) if (!existsSync(join(identityDir, file))) throw new Error('Protected identity files not found.')
    if (!existsSync(join(projectDir, '.env.vm'))) throw new Error('VM configuration not found.')
    execFileSync('az', ['version'], { stdio: 'ignore' })
    execFileSync('docker', ['compose', 'version'], { stdio: 'ignore' })
    const { service, timer } = units({ projectDir, nodePath: process.execPath, identityDir })
    // Check both units before replacing the installed timer configuration.
    const { mkdtempSync, rmSync } = await import('node:fs')
    const staging = mkdtempSync('/tmp/bk-certificate-timer-')
    try {
      writeFileSync(join(staging, 'behandlingskatalogen-certificate.service'), service)
      writeFileSync(join(staging, 'behandlingskatalogen-certificate.timer'), timer)
      execFileSync('systemd-analyze', ['verify', join(staging, 'behandlingskatalogen-certificate.service'), join(staging, 'behandlingskatalogen-certificate.timer')], { stdio: 'inherit' })
    } finally { rmSync(staging, { recursive: true, force: true }) }
    writeFileSync('/etc/systemd/system/behandlingskatalogen-certificate.service', service, { mode: 0o644 })
    writeFileSync('/etc/systemd/system/behandlingskatalogen-certificate.timer', timer, { mode: 0o644 })
    execFileSync('systemctl', ['daemon-reload'], { stdio: 'inherit' })
    execFileSync('systemctl', ['enable', '--now', 'behandlingskatalogen-certificate.timer'], { stdio: 'inherit' })
    execFileSync('systemctl', ['start', 'behandlingskatalogen-certificate.service'], { stdio: 'inherit' })
    console.log('Daily renewal check enabled. Status: /var/lib/behandlingskatalogen-certificate/status.json')
  } catch (error) { console.error('Timer installation failed. Review systemctl/journalctl output; no credential values are printed.'); process.exitCode = 1 }
}
