#!/bin/sh
# GitLab CI helpers — private registry push/pull for dtrs-app
# Requires: docker CLI, REGISTRY_URL
# Optional: REGISTRY_USER + REGISTRY_PASSWORD (skip login if either empty)
# Image remote: ${REGISTRY_URL}/dtrs-app/<name>:<tag>  (local ref = name:tag)
# Tags pushed per build: IMAGE_* ({sha}-env) + TAG_*_LATEST only
# Note: do not `set -eu` at file scope — this file is sourced into CI job shells.

registry_require_url() {
  if [ -z "${REGISTRY_URL:-}" ]; then
    echo "ERROR: REGISTRY_URL is not set (GitLab CI/CD Variables — กลุ่ม E)"
    echo "See docs/GitLab-CI-Variables-Checklist.md"
    exit 1
  fi
}

registry_login() {
  registry_require_url
  if [ -n "${REGISTRY_USER:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
    echo "=== docker login ${REGISTRY_URL} (user=${REGISTRY_USER}) ==="
    printf '%s' "$REGISTRY_PASSWORD" | docker login -u "$REGISTRY_USER" --password-stdin "$REGISTRY_URL"
  else
    echo "REGISTRY_USER/PASSWORD empty — skipping docker login (anonymous)"
  fi
}

# local_ref e.g. dtrs-app-backend:uat-latest → ${REGISTRY_URL}/dtrs-app/dtrs-app-backend:uat-latest
registry_remote_ref() {
  local_ref="$1"
  echo "${REGISTRY_URL}/dtrs-app/${local_ref}"
}

# Drop registry-prefixed local tag only (image stays via short name)
registry_untag_remote_local() {
  remote="$1"
  docker rmi "$remote" >/dev/null 2>&1 || true
}

registry_tag_and_push() {
  local_ref="$1"
  remote="$(registry_remote_ref "$local_ref")"
  echo "=== tag+push ${local_ref} → ${remote} ==="
  docker tag "$local_ref" "$remote"
  if docker push "$remote"; then
    registry_untag_remote_local "$remote"
    return 0
  fi
  # Desktop/new Docker → OCI manifest; registry เก่าตอบ "manifest invalid"
  echo "WARN: docker push failed — retry buildx with oci-mediatypes=false"
  tmp="$(mktemp -d)"
  printf 'FROM %s\n' "$local_ref" >"$tmp/Dockerfile"
  docker buildx build \
    --provenance=false \
    --sbom=false \
    --output "type=image,name=${remote},push=true,oci-mediatypes=false,compression=gzip" \
    "$tmp"
  rm -rf "$tmp"
  registry_untag_remote_local "$remote"
}

# Pull registry image, retag short name, drop registry-prefixed local tag
registry_pull_and_retag() {
  local_ref="$1"
  remote="$(registry_remote_ref "$local_ref")"
  echo "=== pull ${remote} → tag ${local_ref} ==="
  docker pull "$remote"
  docker tag "$remote" "$local_ref"
  registry_untag_remote_local "$remote"
}

# Push sha + latest tags only (no ALT/EXTRA)
registry_push_build_tags() {
  registry_login
  registry_tag_and_push "$IMAGE_BACKEND"
  registry_tag_and_push "$TAG_BACKEND_LATEST"
  registry_tag_and_push "$IMAGE_FRONTEND"
  registry_tag_and_push "$TAG_FRONTEND_LATEST"
}
