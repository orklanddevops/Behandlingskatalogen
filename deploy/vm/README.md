# Ubuntu development VM

From a fresh Ubuntu VM with sudo access and internet access, type:

```sh
sudo apt update
sudo apt install -y git
git clone https://github.com/orklanddevops/Behandlingskatalogen.git bk
cd bk
bash setup.sh
```

Git is the one dependency needed before the repository can be cloned. A private
repository also requires your GitHub credentials. Run setup as your normal user;
it requests sudo when needed. No logout or Docker group change is needed.

Setup installs Docker Engine, the Compose plugin, Git, and the distribution's
Node/npm packages, then builds and starts the entire stack. Host Node dispatches the root package scripts and runs the optional
Key Vault certificate retrieval; the frontend's Node and bundled Yarn,
and the backend's Java and Maven, run inside build containers. No root npm install
is needed. Allow several minutes for the first build and enough RAM/disk for Java
and Next.js builds (4 CPUs, 8 GB RAM, and 30 GB free disk is a useful starting point).

Open http://localhost:3000 in a browser inside the VM. This is a development
instance using the existing local profile, which disables authentication.
It binds to loopback by default. To access it from another machine on a trusted
development network, set VM_BIND_ADDRESS=0.0.0.0 in .env.vm and run npm run deploy;
then browse to http://VM-IP:3000. VM/network firewall rules may also need port 3000.
Do not expose this unauthenticated instance to an untrusted network.

## Internal HTTPS on port 443

For `https://digikatalogen.orkland.kommune.no`, the optional Nginx gateway
terminates TLS on VM port 443 and forwards requests to the frontend on its internal
port 3000. The frontend still proxies API requests to `http://backend:8080`.
No backend URL change is needed. Port 80 is not required; use the HTTPS URL directly.

1. Have the network administrator create a DNS record for
   `digikatalogen.orkland.kommune.no` pointing to the VM's stable LAN IP and
   permit TCP 443 from ansatt-nettet to that VM. The `*.orkland.kommune.no`
   certificate covers this full hostname, not the short name `behandlingskatalogen`.
2. Install the certificate chain and matching private key **on the VM**, in PEM
   format. The chain file must contain the server certificate first, then its
   intermediate certificates. For example, from the project root, replace the
   source paths below with the actual files supplied by your administrator:

   ```sh
   sudo install -d -m 700 .vm-tls
   sudo install -m 644 /path/to/fullchain.pem .vm-tls/fullchain.pem
   sudo install -m 600 /path/to/privkey.pem .vm-tls/privkey.pem
   ```

   `.vm-tls/` is ignored by Git. Keep the private key on the VM; do not paste it
   into chat or commit it. This server certificate is separate from `.vm-ca.pem`,
   which configures outbound HTTPS inspection trust.
3. Edit the existing `.env.vm`, preserving `POSTGRES_PASSWORD`, and set:

   ```dotenv
   COMPOSE_PROFILES=https
   VM_BIND_ADDRESS=127.0.0.1
   VM_PORT=3000
   VM_PUBLIC_URL=https://digikatalogen.orkland.kommune.no
   ```

   `VM_PUBLIC_URL` sets the backend’s allowed sign-in redirect origin. The backend
   trusts the proxy’s forwarded HTTPS headers; its port stays internal to Docker.
   This URL does not by itself configure Entra credentials or enable authentication.

   This keeps direct HTTP access local to the VM while HTTPS listens on all VM
   IPv4 interfaces. Optional settings: `VM_HTTPS_BIND_ADDRESS` (default `0.0.0.0`),
   `VM_HTTPS_PORT` (default `443`), and `VM_TLS_DIR` (default `./.vm-tls`).
4. Validate and deploy:

   ```sh
   bash scripts/vm.sh config
   bash scripts/vm.sh deploy
   bash scripts/vm.sh status
   ```

   The `https` service should be healthy and publish port 443. If it fails, inspect
   `bash scripts/vm.sh logs https`; missing, invalid, or mismatched PEM files will
   prevent Nginx from starting.
5. From a computer on ansatt-nettet, open
   `https://digikatalogen.orkland.kommune.no`. Confirm the browser trusts the
   certificate and you can load application data. You can also run:

   ```sh
   curl --fail --show-error https://digikatalogen.orkland.kommune.no/ > /dev/null
   VM_URL=https://digikatalogen.orkland.kommune.no npm run test:deployment
   ```

   The local gateway health check only checks that its TLS listener responds;
   these hostname-based checks also verify certificate trust and the application.
   If Node needs the company's CA, supply it using `NODE_EXTRA_CA_CERTS`.

For certificates installed manually, replace both PEM files after renewal and reload the gateway:

```sh
sudo docker compose --project-name behandlingskatalogen-vm --env-file .env.vm -f compose.vm.yaml exec https nginx -t
sudo docker compose --project-name behandlingskatalogen-vm --env-file .env.vm -f compose.vm.yaml exec https nginx -s reload
```

HTTPS does not enable application authentication: this deployment still uses the
local profile. Restrict network access to the approved internal users/network.

## Retrieve the latest HTTPS certificate from Key Vault

The JavaScript certificate command defaults to this **versionless** URL:

```text
https://stjernecert.vault.azure.net/certificates/stjerne-orkland-kommune-no-2026
```

It resolves the latest certificate metadata on every run, then downloads that
version's matching backing secret. Even if you supply the original URL ending in
`0101b306f9b24d9dbc0c27faf7833364`, the command deliberately ignores that final
version ID. Renew/import the certificate as a **new version under the same name**.
Creating a different certificate name, such as one ending in `2027`, requires
updating the configured URL with `--certificate-url`; the script does not guess
which other certificate to use.

Prerequisites on the VM:

- Node.js 18+ (already installed by setup), OpenSSL, and Azure CLI (`az`). No npm
  packages or Python are needed for certificate retrieval.
- Configure Azure CLI authentication for the account running the refresh.
  This on-premises VM needs an Entra service principal or another approved
  workload identity; an Azure VM managed identity is not available by default.
  Use the dedicated VM Key Vault service principal with its client secret.
  Keep this credential separate from the employee sign-in app's client secret.
  No identity authentication certificate or Azure Arc agent is required.
- Grant the identity certificate-read and backing-secret-read access for this
  certificate. The private key must be exportable. Reading only the public
  `/certificates/` object is insufficient to run Nginx HTTPS.
- Permit outbound TCP 443 to `login.microsoftonline.com` and
  `stjernecert.vault.azure.net`, plus any identity-specific requirements. The
  vault's own firewall/private endpoint rules must also permit this VM's route.

See Microsoft's [Azure CLI Linux installation instructions](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux)
and [service-principal authentication guidance](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-service-principal).

For the service-principal client-secret setup, create/store the credential in the
protected folder on your PC first, then copy `identifiers.env` and
`keyvault-client-secret` securely to `~/.config/behandlingskatalogen/` on the VM.
These files must remain outside the Git repository. On the VM, run as the account
that will perform certificate refresh:

```sh
BK_IDENTITY_DIR="$HOME/.config/behandlingskatalogen"
chmod 700 "$BK_IDENTITY_DIR"
chmod 600 "$BK_IDENTITY_DIR/identifiers.env" "$BK_IDENTITY_DIR/keyvault-client-secret"
. "$BK_IDENTITY_DIR/identifiers.env"
export AZURE_CONFIG_DIR="$BK_IDENTITY_DIR/azure-keyvault"
az login --service-principal \
  --username "$BK_VAULT_APP" \
  --password="$(cat "$BK_IDENTITY_DIR/keyvault-client-secret")" \
  --tenant 91d14ddc-e451-4a63-83a5-7c9dc6335632 \
  --allow-no-subscriptions --output none
```

Use an interactive administrator login when creating app credentials and role
assignments; the restricted Key Vault workload identity only performs retrieval.
Append a new secret when rotating credentials, update the protected file, test,
and then remove the old credential. Record and monitor the Entra credential's
expiry date. Run workload authentication and certificate refresh together for
scheduled runs rather than relying on an old interactive login session.

After identity access is configured, from the project root run:

```sh
npm run certificate
```

If `.vm-tls` is owned by root as in the manual installation example, run
`sudo npm run certificate` and ensure Azure CLI authentication is configured for
**root**, not just your interactive account. Alternatively, use a dedicated
service account that owns the TLS directory. Private keys are written with mode
`600`; never loosen their permissions to work around an access error.

The wrapper reads the TLS directory from the Compose configuration, including
`VM_TLS_DIR` in `.env.vm`. It validates hostname coverage, dates, and the matching
private key before replacing the PEM files, tests Nginx configuration, and reloads
the running HTTPS gateway. An unchanged certificate causes no reload. A failed
fetch or validation preserves existing files; a failed Nginx test/reload restores
them. On first installation without a running gateway, enable
`COMPOSE_PROFILES=https` in `.env.vm` and run `bash scripts/vm.sh deploy` afterward.

A manual refresh always retrieves the current version. For automatic pickup during
the final week of validity, install the optional timer described below. A normal
deploy does not install a timer.

To change the certificate name later:

```sh
npm run certificate -- --certificate-url https://stjernecert.vault.azure.net/certificates/NEW-NAME
```

The standalone `node scripts/vm-certificate.mjs` command only installs the files;
it accepts `--tls-dir`, `--certificate-url`, `--hostname`, and `--reload` options.
Use the npm wrapper for the configured VM directory and automatic gateway reload.
Run `npm run test:certificate` for offline tests using generated test certificates;
the tests never contact Azure or read the real wildcard certificate.

## Short commands (from the repository root)

| Command | Action |
| --- | --- |
| `bash setup.sh` / `npm run setup` | Install missing VM prerequisites and deploy |
| `npm run deploy` | Build local sources, migrate the database, start and wait for health |
| `npm run update` | Pull the current branch with fast-forward only, then deploy |
| `npm start` | Start existing services and wait for health |
| `npm stop` | Stop/remove containers, preserving database data |
| `npm run restart` | Restart services and wait for health |
| `npm run status` | Show service state |
| `npm run logs` | Follow all service logs; Ctrl+C exits logs only |
| `npm run logs:backend` | Follow backend logs |
| `npm run logs:frontend` | Follow frontend logs |
| `npm run config:vm` | Validate deployment configuration without printing secrets |
| `npm run certificate` | Retrieve the latest Key Vault certificate and reload HTTPS when changed |

Services restart automatically when Docker starts after a VM reboot unless
explicitly stopped. Deploy rebuilds the current checkout; update pulls first and
refuses tracked local changes. No command resets local work or deletes the database.

## What runs

- PostgreSQL 16 with a persistent Docker volume; no host database port.
- Java backend built from source; Flyway applies migrations on startup.
- Next.js frontend using its existing Dockerfile, bundled Yarn, tests, and build.
  API requests go through its existing proxy to the backend.
- An internal static codelist service serving the repository's country JSON files
  in the NAV Kodeverk format. The Azure Functions deployment is not required.
  The bundled data currently includes Norway only.

Team catalogue, term catalogue, and NAV NOM organisation integrations are disabled for this VM.
Local organisation lists are managed under Admin → Kodeverk; see [local organisation lists](local-organisation.md). Stored organisation IDs remain available as fallback labels in exports.
Other NAV integrations/links can still require NAV access. The backend currently
retrieves Microsoft's OIDC discovery metadata during startup even with local
authentication disabled, so outbound HTTPS to Microsoft is required.

.env.vm is created once with a generated database password and ignored by Git.
Keep it when redeploying: changing its password does not change an existing
PostgreSQL volume's credentials. Changing the port/bind address takes effect on
the next deploy. Back up the PostgreSQL database before important migrations;
stopping containers is not a backup.

The VM backend build skips Java tests; the existing frontend image runs its tests.
Deployment only reports success when database, codelists, backend and frontend
health checks pass. On failure, inspect status and logs using the commands above.

Docker installation follows the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/).

## Validate the command wrapper

Run `npm run test:vm` (requires Python 3). These isolated checks cover
credential preservation, health-check failure handling, safe updates, and commands
that retain database volumes. They do not install packages or start containers.

## Networks with HTTPS inspection

For a firewall that inspects HTTPS, provide its approved, unexpired public CA
certificate in PEM format as .vm-ca.pem at the repository root before deploying.
Alternatively set VM_CA_CERT_FILE to a PEM file when running deploy.
The supplied public CA is added to the frontend and Java trust stores;
TLS verification remains enabled. For a VM where the supplied Orkland firewall CA
is already installed under either of its known filenames in
/usr/local/share/ca-certificates, setup recognizes it by its exact SHA-256
fingerprint and expiry date. Only that verified certificate is reused
automatically; unrelated host certificates are never imported.

.vm-ca.pem is ignored by Git and preserved between deployments. It contains
public certificates only, never private keys. A changed bundle invalidates the
relevant build cache. On a new VM behind the firewall, the host and Docker daemon
must also trust the approved certificate for setup and image pulls to succeed.

## Check a running development deployment

Run `npm run test:deployment` after deployment. It makes read-only requests through
the frontend to verify the page, backend/database health, local user permissions,
country codes, and the offline team/resource/term fallbacks. It uses VM_PORT from
.env.vm; set VM_URL to test a different base URL. No application data is changed.

## Configure employee sign-in for the VM

The packaged local profile supplies NAV tenant defaults and dummy client
credentials. Changing the callback hostname alone does not configure sign-in.
The optional protected `.vm-auth.compose.json` overrides those defaults using
`SPRING_APPLICATION_JSON`, which takes precedence over packaged properties.

On the PC, in WSL, with the previously created protected identity files, run:

```sh
node scripts/vm-auth.mjs
```

This reads `~/.config/behandlingskatalogen/identifiers.env` and
`signin-client-secret`. It writes `~/.config/behandlingskatalogen/vm-auth.compose.json`
with permissions 600. The JSON contains the client secret and session encryption
key: never print it, commit it, or paste it into chat. It uses the Orkland tenant
`91d14ddc-e451-4a63-83a5-7c9dc6335632`, the sign-in client ID (not the Key Vault
identity), and `https://digikatalogen.orkland.kommune.no/`. Regenerating preserves
the encryption key in an existing output file so active sessions are not
unnecessarily invalidated.

Copy this file to the project root on the VM as `.vm-auth.compose.json` using scp.
Copy the updated `scripts/vm.sh` too so future deploy/start/restart commands retain
the override. On the VM:

```sh
chmod 600 .vm-auth.compose.json
sudo docker compose --project-name behandlingskatalogen-vm --env-file .env.vm -f compose.vm.yaml -f .vm-auth.compose.json up -d --no-deps --force-recreate --wait backend
```

The wrapper automatically includes this file when present. It enables application
security and removes the local profile's anonymous WRITE/ADMIN behavior. Existing
public READ endpoints remain as defined by the application's security rules;
this is not a change to make all application content private. With no explicit
group mappings, no employee receives WRITE/SUPER/ADMIN roles from this setup.
Supply the approved Entra group IDs using repeatable `--write-group`,
`--super-group`, and `--admin-group` options when generating the file. One group
currently maps to one application role, so use separate groups for separate roles.

After deployment, `/login` should redirect to the Orkland tenant and use the
new sign-in client ID. Verify a full browser sign-in and check that anonymous
`/api/userinfo` no longer returns WRITE/ADMIN. The existing `test:deployment`
script's development-user check expects anonymous admin access and is not
appropriate as an authentication acceptance check. Existing sessions may require
signing in again when authentication is first enabled.

The Entra app must register the exact HTTPS callback:
`https://digikatalogen.orkland.kommune.no/oauth2/callback`.

## Callback CORS and dashboard troubleshooting

The VM disables `client.nom.graphql.enabled` to avoid calls to NAV's internal
organisation service. Dashboard statistics still use the local database; no NAV
organisation tree is populated. Java changes require a backend image rebuild.

Callback CORS explicitly permits Microsoft login and the configured application
origins for POST/OPTIONS. Application redirect URLs are normalized to origins for
CORS, so a trailing slash in a redirect URL does not become part of an origin.
The sign-in configuration generator enables DEBUG logging only for Spring's
DefaultCorsProcessor. If a real callback still returns 403, inspect backend logs
for `Reject:` to identify the actual origin, method, or header rejected. A successful
preflight alone does not prove the real browser callback succeeds. Do not share
login codes, state, cookies, or client secrets while troubleshooting.

### Access-token version for employee sign-in

Configure the sign-in resource app for access-token version 2:

```sh
az ad app update --id "$BK_SIGNIN_APP" --requested-access-token-version 2
```

A null/default setting issues v1 access tokens even when login uses the v2
authorization endpoint. The backend validates against the tenant-specific v2 OIDC
issuer; a v1 session token is rejected with `Invalid token issuer` and subsequent
requests can fail while its session cookie is present. After correcting the app
setting, restart the backend to clear its token cache, clear application cookies,
and sign in afresh. Do not weaken issuer validation or allow arbitrary issuers.

## Expiry-aware certificate renewal timer

After the updated scripts are on the VM, install the daily systemd check:

```sh
sudo node scripts/install-vm-certificate-timer.mjs --identity-dir "$HOME/.config/behandlingskatalogen"
```

This creates `behandlingskatalogen-certificate.service` and
`behandlingskatalogen-certificate.timer`, enables the timer, and runs an initial
check. Run the installer as shown from the normal administrator shell so `$HOME`
identifies the account holding `identifiers.env` and `keyvault-client-secret`.
The service runs as root to read the protected files and reload Docker without an
interactive sudo prompt. Azure CLI, OpenSSL, Docker Compose, and Node must already
be installed on the VM. The installer checks unit syntax before installation.

Every check reads the actual installed leaf certificate from the TLS directory
configured in Compose, including `VM_TLS_DIR`, and records expiry, fingerprint,
renewal-window start, and result in:

```text
/var/lib/behandlingskatalogen-certificate/status.json
```

Until seven days before expiry, no Azure authentication or download is performed.
During the last seven days (and if already expired or missing), every daily run
performs a fresh service-principal client-secret login and requests the latest
version from Key Vault. Subscription discovery is skipped, so the workload does
not need `management.azure.com`. The service uses its own protected Azure CLI
cache under `/var/lib/behandlingskatalogen-certificate/azure`.

If the current version is still latest, it keeps the installed files and tries
again on the next run. A changed replacement must cover the hostname, have a
matching private key, be valid now, and extend the installed expiry date. After
installation, Nginx configuration is checked and reloaded. Authentication,
network, validation, and reload failures are recorded as failures, preserving the
working certificate; the timer still tries again on its next daily activation.
After success, subsequent checks wait for the new certificate's final week.

The calendar check runs daily in the VM's timezone with up to 15 minutes of
random delay, also checks shortly after boot, and catches missed calendar runs.
It therefore begins retrieval on the first check within the seven-day window.
The latest version must keep the same Key Vault certificate name. The Key Vault
identity's client secret must still be rotated before its own expiry.

Inspect the schedule, recorded expiry, and errors:

```sh
systemctl list-timers behandlingskatalogen-certificate.timer
sudo cat /var/lib/behandlingskatalogen-certificate/status.json
sudo journalctl -u behandlingskatalogen-certificate.service --since today
```

Run a check immediately, or disable the timer:

```sh
sudo systemctl start behandlingskatalogen-certificate.service
sudo systemctl disable --now behandlingskatalogen-certificate.timer
```

Failures appear in the service journal and status file; this does not configure
email or other notifications. Your normal VM monitoring can alert on a failed
service or a certificate still near expiry.
