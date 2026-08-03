name: Sync Frontend Image to ACR
on:
  workflow_run:
    workflows: ["Create Frontend Image package"]
    types:
      - completed
  workflow_dispatch:
  workflow_call:

jobs:
  promote-to-azure:
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'workflow_call' || github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    steps:
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.ASOH_TOKEN }}

      - name: Login to ACR
        uses: docker/login-action@v3
        with:
          registry: pollyorkla-cab5fee3chhye4f8.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Sync Frontend Image
        run: |
          docker buildx imagetools create \
            --tag pollyorkla-cab5fee3chhye4f8.azurecr.io/polly-frontend:latest \
            ghcr.io/orklanddevops/polly-frontend:latest
