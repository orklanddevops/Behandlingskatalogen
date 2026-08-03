name: Create Frontend Image package
on:
  workflow_dispatch: # run manually from the "Actions" tab
  workflow_call:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.ASOH_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./apps/frontend
          platforms: linux/amd64
          push: true
          provenance: false # fixes the "Invalid OS" error for Azure
          tags: ghcr.io/orklanddevops/polly-frontend:latest
