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
Node/npm packages, then builds and starts the entire stack. Host Node is only
used to dispatch the root package scripts; the frontend's Node and bundled Yarn,
and the backend's Java and Maven, run inside build containers. No root npm install
is needed. Allow several minutes for the first build and enough RAM/disk for Java
and Next.js builds (4 CPUs, 8 GB RAM, and 30 GB free disk is a useful starting point).

Open http://localhost:3000 in a browser inside the VM. This is a development
instance using the existing local profile, which disables authentication.
It binds to loopback by default. To access it from another machine on a trusted
development network, set VM_BIND_ADDRESS=0.0.0.0 in .env.vm and run npm run deploy;
then browse to http://VM-IP:3000. VM/network firewall rules may also need port 3000.
Do not expose this unauthenticated instance to an untrusted network.

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
