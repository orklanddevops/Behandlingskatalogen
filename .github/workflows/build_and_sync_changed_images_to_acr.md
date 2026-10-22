name: Build and Sync Changed Images to ACR
on:
  push:
    branches:
      - master
    paths:
      - apps/backend/**
      - apps/frontend/**
      - .github/workflows/backend_image_pkgs.yml
      - .github/workflows/frontend_image_pkgs.yml
      - .github/workflows/Sync_Backend_Image_To_ACR.yml
      - .github/workflows/Sync_Frontend_Image_To_ACR.yml
      - .github/workflows/build_and_sync_changed_images_to_acr.yml
  workflow_dispatch:
    inputs:
      force_backend:
        description: Build and sync backend even if no backend files changed
        required: false
        type: boolean
        default: false
      force_frontend:
        description: Build and sync frontend even if no frontend files changed
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  packages: write

concurrency:
  group: build-and-sync-changed-images-to-acr-${{ github.ref }}
  cancel-in-progress: false

jobs:
  changes:
    name: Detect changed apps
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.detect.outputs.backend }}
      frontend: ${{ steps.detect.outputs.frontend }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect backend and frontend changes
        id: detect
        shell: bash
        run: |
          set -euo pipefail

          if [[ "${{ github.event_name }}" == "push" ]]; then
            base="${{ github.event.before }}"
            head="${{ github.sha }}"
            if [[ "$base" == "0000000000000000000000000000000000000000" ]]; then
              base="$(git rev-list --max-parents=0 "$head")"
            fi
          else
            head="${{ github.sha }}"
            base="$(git rev-parse "$head^" 2>/dev/null || git rev-list --max-parents=0 "$head")"
          fi

          git diff --name-only "$base" "$head" > changed-files.txt

          backend=false
          frontend=false

          if grep -Eq '^(apps/backend/|\.github/workflows/(backend_image_pkgs|Sync_Backend_Image_To_ACR|build_and_sync_changed_images_to_acr)\.yml$)' changed-files.txt; then
            backend=true
          fi

          if grep -Eq '^(apps/frontend/|\.github/workflows/(frontend_image_pkgs|Sync_Frontend_Image_To_ACR|build_and_sync_changed_images_to_acr)\.yml$)' changed-files.txt; then
            frontend=true
          fi

          if [[ "${{ github.event_name }}" == "workflow_dispatch" && "${{ inputs.force_backend }}" == "true" ]]; then
            backend=true
          fi

          if [[ "${{ github.event_name }}" == "workflow_dispatch" && "${{ inputs.force_frontend }}" == "true" ]]; then
            frontend=true
          fi

          echo "backend=$backend" >> "$GITHUB_OUTPUT"
          echo "frontend=$frontend" >> "$GITHUB_OUTPUT"

          echo "Backend changed: $backend"
          echo "Frontend changed: $frontend"

  create-backend-image-package:
    name: Create backend image package
    needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' }}
    uses: ./.github/workflows/backend_image_pkgs.yml
    secrets: inherit

  sync-backend-image-to-acr:
    name: Sync backend image to ACR
    needs:
      - changes
      - create-backend-image-package
    if: ${{ needs.changes.outputs.backend == 'true' && needs.create-backend-image-package.result == 'success' }}
    uses: ./.github/workflows/Sync_Backend_Image_To_ACR.yml
    secrets: inherit

  create-frontend-image-package:
    name: Create frontend image package
    needs: changes
    if: ${{ needs.changes.outputs.frontend == 'true' }}
    uses: ./.github/workflows/frontend_image_pkgs.yml
    secrets: inherit

  sync-frontend-image-to-acr:
    name: Sync frontend image to ACR
    needs:
      - changes
      - create-frontend-image-package
    if: ${{ needs.changes.outputs.frontend == 'true' && needs.create-frontend-image-package.result == 'success' }}
    uses: ./.github/workflows/Sync_Frontend_Image_To_ACR.yml
    secrets: inherit
