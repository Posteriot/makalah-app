#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-.env.xendit.production.local}"
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Usage:
  scripts/sync-xendit-production-env.sh [env-file]

Default env file:
  .env.xendit.production.local

Required variables inside env file:
  XENDIT_SECRET_KEY
  XENDIT_WEBHOOK_SECRET or XENDIT_WEBHOOK_TOKEN

Optional variables:
  APP_URL
  NEXT_PUBLIC_APP_URL
  CONVEX_INTERNAL_KEY
  SYNC_VERCEL=1
  SYNC_CONVEX=1
  SYNC_LOCAL_ENV=0
  SYNC_CONVEX_INTERNAL_KEY_FROM_LOCAL_ENV=1
  CONVEX_TARGET=linked
  VERCEL_ENV=production

Dry run:
  DRY_RUN=1 scripts/sync-xendit-production-env.sh
EOF
}

if [[ "${ENV_FILE}" == "--help" || "${ENV_FILE}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

is_placeholder() {
  local value="${1:-}"
  [[ -z "${value}" || "${value}" == "__FILL_ME__" ]]
}

require_value() {
  local name="$1"
  local value="${!name:-}"
  if is_placeholder "${value}"; then
    echo "Missing required value: ${name}" >&2
    exit 1
  fi
}

run_cmd() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    printf '[dry-run] %q' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

upsert_env_file_value() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local temp_file
  temp_file="$(mktemp)"

  if [[ -f "${file_path}" ]] && grep -q "^${key}=" "${file_path}"; then
    awk -v key="${key}" -v value="${value}" '
      BEGIN { updated = 0 }
      $0 ~ "^" key "=" {
        print key "=\"" value "\""
        updated = 1
        next
      }
      { print }
      END {
        if (updated == 0) {
          print key "=\"" value "\""
        }
      }
    ' "${file_path}" > "${temp_file}"
  else
    if [[ -f "${file_path}" ]]; then
      cat "${file_path}" > "${temp_file}"
    fi
    printf '%s="%s"\n' "${key}" "${value}" >> "${temp_file}"
  fi

  mv "${temp_file}" "${file_path}"
}

require_value "XENDIT_SECRET_KEY"

if is_placeholder "${XENDIT_WEBHOOK_SECRET:-}" && is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
  echo "Missing required webhook verification value: set XENDIT_WEBHOOK_SECRET or XENDIT_WEBHOOK_TOKEN" >&2
  exit 1
fi

SYNC_VERCEL="${SYNC_VERCEL:-1}"
SYNC_CONVEX="${SYNC_CONVEX:-1}"
SYNC_LOCAL_ENV="${SYNC_LOCAL_ENV:-0}"
SYNC_CONVEX_INTERNAL_KEY_FROM_LOCAL_ENV="${SYNC_CONVEX_INTERNAL_KEY_FROM_LOCAL_ENV:-1}"
CONVEX_TARGET="${CONVEX_TARGET:-linked}"
VERCEL_ENV="${VERCEL_ENV:-production}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-${APP_URL:-}}"

GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"
MAIN_PROJECT_ROOT="$(cd "${GIT_COMMON_DIR}/.." && pwd)"
LOCAL_ENV_FILE=".env.local"

read_local_env_value() {
  local key="$1"
  local file_path="${2:-${LOCAL_ENV_FILE}}"

  if [[ ! -f "${file_path}" ]]; then
    return 1
  fi

  awk -F= -v key="${key}" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "${file_path}"
}

if [[ "${SYNC_LOCAL_ENV}" == "1" ]]; then
  if is_placeholder "${APP_URL:-}"; then
    echo "APP_URL is required when SYNC_LOCAL_ENV=1" >&2
    exit 1
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] would update ${LOCAL_ENV_FILE} with Xendit production values"
  else
    upsert_env_file_value "${LOCAL_ENV_FILE}" "APP_URL" "${APP_URL}"
    upsert_env_file_value "${LOCAL_ENV_FILE}" "NEXT_PUBLIC_APP_URL" "${NEXT_PUBLIC_APP_URL}"
    upsert_env_file_value "${LOCAL_ENV_FILE}" "XENDIT_SECRET_KEY" "${XENDIT_SECRET_KEY}"
    if ! is_placeholder "${XENDIT_WEBHOOK_SECRET:-}"; then
      upsert_env_file_value "${LOCAL_ENV_FILE}" "XENDIT_WEBHOOK_SECRET" "${XENDIT_WEBHOOK_SECRET}"
    fi
    if ! is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
      upsert_env_file_value "${LOCAL_ENV_FILE}" "XENDIT_WEBHOOK_TOKEN" "${XENDIT_WEBHOOK_TOKEN}"
    fi
  fi
fi

if [[ "${SYNC_CONVEX}" == "1" ]]; then
  if [[ "${CONVEX_TARGET}" == "prod" ]]; then
    run_cmd npx convex env set --prod XENDIT_SECRET_KEY "${XENDIT_SECRET_KEY}"
    if ! is_placeholder "${XENDIT_WEBHOOK_SECRET:-}"; then
      run_cmd npx convex env set --prod XENDIT_WEBHOOK_SECRET "${XENDIT_WEBHOOK_SECRET}"
    fi
    if ! is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
      run_cmd npx convex env set --prod XENDIT_WEBHOOK_TOKEN "${XENDIT_WEBHOOK_TOKEN}"
    fi
  elif [[ "${CONVEX_TARGET}" == "linked" ]]; then
    run_cmd npx convex env set XENDIT_SECRET_KEY "${XENDIT_SECRET_KEY}"
    if ! is_placeholder "${XENDIT_WEBHOOK_SECRET:-}"; then
      run_cmd npx convex env set XENDIT_WEBHOOK_SECRET "${XENDIT_WEBHOOK_SECRET}"
    fi
    if ! is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
      run_cmd npx convex env set XENDIT_WEBHOOK_TOKEN "${XENDIT_WEBHOOK_TOKEN}"
    fi
  else
    convex_target_flag="--deployment-name"
    run_cmd npx convex env set "${convex_target_flag}" "${CONVEX_TARGET}" XENDIT_SECRET_KEY "${XENDIT_SECRET_KEY}"
    if ! is_placeholder "${XENDIT_WEBHOOK_SECRET:-}"; then
      run_cmd npx convex env set "${convex_target_flag}" "${CONVEX_TARGET}" XENDIT_WEBHOOK_SECRET "${XENDIT_WEBHOOK_SECRET}"
    fi
    if ! is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
      run_cmd npx convex env set "${convex_target_flag}" "${CONVEX_TARGET}" XENDIT_WEBHOOK_TOKEN "${XENDIT_WEBHOOK_TOKEN}"
    fi
  fi
fi

sync_vercel_secret() {
  local name="$1"
  local value="$2"

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] vercel env add ${name} ${VERCEL_ENV} --force --cwd ${MAIN_PROJECT_ROOT}"
    return 0
  fi

  printf '%s' "${value}" | vercel env add "${name}" "${VERCEL_ENV}" --force --sensitive --cwd "${MAIN_PROJECT_ROOT}"
}

sync_vercel_plain() {
  local name="$1"
  local value="$2"

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] vercel env add ${name} ${VERCEL_ENV} --force --cwd ${MAIN_PROJECT_ROOT}"
    return 0
  fi

  printf '%s' "${value}" | vercel env add "${name}" "${VERCEL_ENV}" --force --cwd "${MAIN_PROJECT_ROOT}"
}

if [[ "${SYNC_VERCEL}" == "1" ]]; then
  if is_placeholder "${APP_URL:-}"; then
    echo "APP_URL is required when SYNC_VERCEL=1" >&2
    exit 1
  fi

  if is_placeholder "${CONVEX_INTERNAL_KEY:-}" && [[ "${SYNC_CONVEX_INTERNAL_KEY_FROM_LOCAL_ENV}" == "1" ]]; then
    CONVEX_INTERNAL_KEY="$(read_local_env_value "CONVEX_INTERNAL_KEY" "${LOCAL_ENV_FILE}")"
  fi

  sync_vercel_plain "APP_URL" "${APP_URL}"
  if ! is_placeholder "${NEXT_PUBLIC_APP_URL:-}"; then
    sync_vercel_plain "NEXT_PUBLIC_APP_URL" "${NEXT_PUBLIC_APP_URL}"
  fi
  sync_vercel_secret "XENDIT_SECRET_KEY" "${XENDIT_SECRET_KEY}"
  if ! is_placeholder "${XENDIT_WEBHOOK_SECRET:-}"; then
    sync_vercel_secret "XENDIT_WEBHOOK_SECRET" "${XENDIT_WEBHOOK_SECRET}"
  fi
  if ! is_placeholder "${XENDIT_WEBHOOK_TOKEN:-}"; then
    sync_vercel_secret "XENDIT_WEBHOOK_TOKEN" "${XENDIT_WEBHOOK_TOKEN}"
  fi
  if ! is_placeholder "${CONVEX_INTERNAL_KEY:-}"; then
    sync_vercel_secret "CONVEX_INTERNAL_KEY" "${CONVEX_INTERNAL_KEY}"
  fi
fi

echo "Xendit production sync completed."
