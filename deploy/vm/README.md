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

For `https://behandlingskatalogen.orkland.kommune.no`, the optional Nginx gateway
terminates TLS on VM port 443 and forwards requests to the frontend on its internal
port 3000. The frontend still proxies API requests to `http://backend:8080`.
No backend URL change is needed. Port 80 is not required; use the HTTPS URL directly.

1. Have the network administrator create a DNS record for
   `behandlingskatalogen.orkland.kommune.no` pointing to the VM's stable LAN IP and
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
   ```

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
   `https://behandlingskatalogen.orkland.kommune.no`. Confirm the browser trusts the
   certificate and you can load application data. You can also run:

   ```sh
   curl --fail --show-error https://behandlingskatalogen.orkland.kommune.no/ > /dev/null
   VM_URL=https://behandlingskatalogen.orkland.kommune.no npm run test:deployment
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

A manual refresh always retrieves the current version; **no periodic refresh is
installed automatically**. Schedule the same command through your organization's
VM management tooling under its configured service identity if automatic renewal
pickup is required. Configure failure alerts there so a failed refresh is noticed.

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

Team catalogue and term catalogue integrations are disabled for this VM.
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
