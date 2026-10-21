#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ "$(uname -s)" != Linux ]]; then
  echo "Run this setup on the Ubuntu VM." >&2
  exit 1
fi
source /etc/os-release
if [[ "$ID" != ubuntu ]]; then
  echo "Automatic setup supports Ubuntu. Install Docker Compose and npm manually on other distributions." >&2
  exit 1
fi
admin=()
if (( EUID != 0 )); then
  command -v sudo >/dev/null || { echo "Setup needs root or sudo." >&2; exit 1; }
  admin=(sudo)
fi
"${admin[@]}" apt-get update
"${admin[@]}" apt-get install -y ca-certificates curl git nodejs npm
if ! docker compose version >/dev/null 2>&1; then
  "${admin[@]}" install -m 0755 -d /etc/apt/keyrings
  "${admin[@]}" curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" -o /etc/apt/keyrings/docker.asc
  "${admin[@]}" chmod a+r /etc/apt/keyrings/docker.asc
  arch=$(dpkg --print-architecture)
  printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' "${UBUNTU_CODENAME:-$VERSION_CODENAME}" "$arch" |
    "${admin[@]}" tee /etc/apt/sources.list.d/docker.sources >/dev/null
  "${admin[@]}" apt-get update
  "${admin[@]}" apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
"${admin[@]}" systemctl enable --now docker
exec bash scripts/vm.sh deploy
