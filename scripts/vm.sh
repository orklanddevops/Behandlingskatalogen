#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
action=${1:-deploy}
case "$action" in
  deploy|update|start|stop|restart|status|logs|config|certificate|reload-https) ;;
  *) echo "Usage: bash scripts/vm.sh {deploy|update|start|stop|restart|status|logs|config|certificate|reload-https}" >&2; exit 2 ;;
esac
shift || true
command -v docker >/dev/null || { echo "Docker is missing. Run: bash setup.sh" >&2; exit 1; }
docker_cmd=(docker)
if ! docker info >/dev/null 2>&1; then
  if (( EUID != 0 )) && command -v sudo >/dev/null; then
    docker_cmd=(sudo docker)
  else
    echo "Docker is unavailable. Start Docker or run: bash setup.sh" >&2
    exit 1
  fi
fi
"${docker_cmd[@]}" compose version >/dev/null
# Create once: never replace the password for an existing database.
if [[ ! -e .env.vm ]]; then
  (umask 077; set -o noclobber
    password=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
    printf 'POSTGRES_PASSWORD=%s\nVM_BIND_ADDRESS=127.0.0.1\nVM_PORT=3000\n' "$password" > .env.vm)
fi
# An optional, explicitly supplied public CA bundle for inspected networks.
# Preserve this file between deployments; never copy unrelated host trust roots.
if [[ -n "${VM_CA_CERT_FILE:-}" ]]; then
  if [[ "$VM_CA_CERT_FILE" != ".vm-ca.pem" ]]; then
    cp -- "$VM_CA_CERT_FILE" .vm-ca.pem
  fi
elif [[ ! -e .vm-ca.pem ]]; then
  : > .vm-ca.pem
  # Recognize only the exact, unexpired firewall CA supplied for this project.
  # Do not import any other certificates from the host trust store.
  for cert in /usr/local/share/ca-certificates/checkpoint-ssl-inspect2023-2038.crt \
              /usr/local/share/ca-certificates/sslinspect.orkland.kommune.no.crt; do
    if [[ -r "$cert" ]] && command -v openssl >/dev/null &&
       fingerprint=$(openssl x509 -in "$cert" -outform DER 2>/dev/null | sha256sum | cut -d ' ' -f 1); then
      if [[ "$fingerprint" == 7ce0fb7ff8671b023d335df79bbb6295a8ca6ee943f3ae07caced9a205b71803 ]] &&
         openssl x509 -in "$cert" -checkend 0 -noout >/dev/null 2>&1; then
        openssl x509 -in "$cert" -out .vm-ca.pem
        break
      fi
    fi
  done
fi
export VM_CA_SHA256
VM_CA_SHA256=$(sha256sum .vm-ca.pem | cut -d ' ' -f 1)
compose=("${docker_cmd[@]}" compose --project-name behandlingskatalogen-vm --env-file .env.vm -f compose.vm.yaml)
# Local sign-in secrets override the packaged local-profile placeholders.
if [[ -f .vm-auth.compose.json ]]; then
  compose+=(-f .vm-auth.compose.json)
fi
trap 'echo "VM command failed. Inspect: npm run status / npm run logs" >&2' ERR
case "$action" in
  deploy)
    "${compose[@]}" up -d --build --wait --wait-timeout 300
    "${compose[@]}" ps
    echo "Deployment ready. Local HTTP: http://localhost:3000 (see .env.vm for overrides)."
    echo "With COMPOSE_PROFILES=https: https://digikatalogen.orkland.kommune.no (see deploy/vm/README.md)."
    ;;
  update)
    if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
      echo "Commit or stash tracked changes before updating." >&2
      exit 1
    fi
    git pull --ff-only
    exec bash scripts/vm.sh deploy
    ;;
  start) "${compose[@]}" up -d --wait --wait-timeout 300 ;;
  stop) "${compose[@]}" down ;;
  restart) "${compose[@]}" restart; "${compose[@]}" up -d --wait --wait-timeout 300 ;;
  status) "${compose[@]}" ps -a ;;
  logs) "${compose[@]}" logs --follow --tail 100 "$@" ;;
  config) "${compose[@]}" config --quiet ;;
  certificate)
    tls_dir=$("${compose[@]}" --profile https config --format json |
      node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>console.log(JSON.parse(s).services.https.volumes.find(v=>v.target==="/etc/nginx/tls").source))')
    node scripts/vm-certificate.mjs --tls-dir "$tls_dir" --reload "$@"
    ;;
  reload-https)
    if [[ -n "$("${compose[@]}" --profile https ps --status running -q https)" ]]; then
      "${compose[@]}" --profile https exec -T https nginx -t
      "${compose[@]}" --profile https exec -T https nginx -s reload
    else
      echo "HTTPS gateway is not running; the certificate will be loaded on the next HTTPS deploy."
    fi
    ;;
esac
