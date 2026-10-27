#!/bin/sh
# Local Docker cleanup — dtrs-app images only (no host-wide prune, no registry API DELETE).
# Required: CLEANUP_ENV=uat|prd, docker CLI, DOCKER_HOST (optional)
# Optional: CLEANUP_KEEP_IMAGES (default 2), APP_IMAGE_*, REGISTRY_URL
# Safe: only rmi refs under dtrs-app-backend / dtrs-app-frontend (+ registry-prefixed twin).

KEEP="${CLEANUP_KEEP_IMAGES:-2}"
ENV_NAME="${CLEANUP_ENV:-}"
BACKEND="${APP_IMAGE_BACKEND:-dtrs-app-backend}"
FRONTEND="${APP_IMAGE_FRONTEND:-dtrs-app-frontend}"

if [ "$ENV_NAME" != "uat" ] && [ "$ENV_NAME" != "prd" ]; then
  echo "ERROR: CLEANUP_ENV must be uat or prd (got: '${ENV_NAME}')"
  exit 1
fi

case "$KEEP" in
  ''|*[!0-9]*)
    echo "ERROR: CLEANUP_KEEP_IMAGES must be a positive integer (got: '${KEEP}')"
    exit 1
    ;;
esac
if [ "$KEEP" -lt 1 ]; then
  echo "ERROR: CLEANUP_KEEP_IMAGES must be >= 1"
  exit 1
fi

is_legacy_tag() {
  tag="$1"
  if [ "$ENV_NAME" = "uat" ]; then
    [ "$tag" = "latest-uat" ]
    return $?
  fi
  [ "$tag" = "prd" ] || [ "$tag" = "prd-latest" ]
}

is_canonical_tag() {
  tag="$1"
  if is_legacy_tag "$tag"; then
    return 1
  fi
  if [ "$ENV_NAME" = "uat" ]; then
    [ "$tag" = "uat-latest" ] && return 0
    case "$tag" in
      *-uat) return 0 ;;
      *) return 1 ;;
    esac
  fi
  [ "$tag" = "latest-prd" ] && return 0
  case "$tag" in
    *-prd) return 0 ;;
    *) return 1 ;;
  esac
}

rmi_ref() {
  ref="$1"
  echo "  rmi ${ref}"
  docker rmi "$ref" >/dev/null 2>&1 || docker rmi -f "$ref" >/dev/null 2>&1 || true
}

registry_repo_for() {
  app="$1"
  if [ -n "${REGISTRY_URL:-}" ]; then
    echo "${REGISTRY_URL}/dtrs-app/${app}"
  fi
}

delete_legacy_for_app() {
  app="$1"
  remote="$(registry_repo_for "$app")"
  if [ "$ENV_NAME" = "uat" ]; then
    set -- latest-uat
  else
    set -- prd prd-latest
  fi
  for tag in "$@"; do
    rmi_ref "${app}:${tag}"
    if [ -n "$remote" ]; then
      rmi_ref "${remote}:${tag}"
    fi
  done
}

# Untag leftover registry-prefixed refs for this env (short name keeps the image).
delete_registry_prefixed_env_tags() {
  app="$1"
  remote="$(registry_repo_for "$app")"
  [ -n "$remote" ] || return 0

  docker images --format '{{.Repository}} {{.Tag}}' | while read -r repo tag; do
    [ "$repo" = "$remote" ] || continue
    [ "$tag" = "<none>" ] && continue
    if is_legacy_tag "$tag" || is_canonical_tag "$tag"; then
      rmi_ref "${repo}:${tag}"
    fi
  done
}

# Keep newest KEEP image IDs among short-name canonical tags; rmi older matching tags.
prune_old_canonical_for_app() {
  app="$1"
  tmp="$(mktemp)"
  docker images --format '{{.CreatedAt}}\t{{.ID}}\t{{.Tag}}' "$app" 2>/dev/null | while IFS="$(printf '\t')" read -r created id tag; do
    [ "$tag" = "<none>" ] && continue
    is_canonical_tag "$tag" || continue
    printf '%s\t%s\t%s\n' "$created" "$id" "$tag"
  done | sort -r >"$tmp"

  if [ ! -s "$tmp" ]; then
    echo "  (no canonical ${ENV_NAME} tags for ${app})"
    rm -f "$tmp"
    return 0
  fi

  keep_ids="$(awk -F'\t' '{print $2}' "$tmp" | awk 'NF && !seen[$0]++' | head -n "$KEEP")"
  echo "  keep ${KEEP} newest id(s):"
  echo "$keep_ids" | sed 's/^/    /'

  while IFS="$(printf '\t')" read -r _created id tag; do
    echo "$keep_ids" | grep -qx "$id" && continue
    rmi_ref "${app}:${tag}"
  done <"$tmp"

  rm -f "$tmp"
}

echo "=== dtrs-app local cleanup env=${ENV_NAME} keep=${KEEP} DOCKER_HOST=${DOCKER_HOST:-local} ==="
echo "Before:"
docker system df || true

for app in "$BACKEND" "$FRONTEND"; do
  echo "--- ${app} ---"
  echo "legacy tags:"
  delete_legacy_for_app "$app"
  echo "canonical keep/${KEEP}:"
  prune_old_canonical_for_app "$app"
  echo "registry-prefixed local tags:"
  delete_registry_prefixed_env_tags "$app"
done

echo "After:"
docker system df || true
echo "=== cleanup done (dtrs-app only) ==="
