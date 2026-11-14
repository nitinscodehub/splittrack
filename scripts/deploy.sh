#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env. Run: npm run setup"
  exit 1
fi

if command -v vercel >/dev/null 2>&1; then
  VERCEL=(vercel)
else
  VERCEL=(npx --yes vercel)
fi

env_value() {
  local wanted="$1"
  local rawLine line key value
  while IFS= read -r rawLine || [[ -n "$rawLine" ]]; do
    line="${rawLine%$'\r'}"
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    key="${key//[[:space:]]/}"
    [[ "$key" == "$wanted" ]] || continue

    value="${line#*=}"
    if [[ "$value" =~ ^\".*\"$ ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
    return 0
  done < .env
  return 1
}

echo
read -r -p "Production URL (for example https://splittrack.vercel.app): " APP_URL
APP_URL="${APP_URL%/}"
if [[ -z "$APP_URL" ]]; then
  echo "Production URL is required."
  exit 1
fi
if [[ ! "$APP_URL" =~ ^https:// ]]; then
  echo "Production URL must start with https://"
  exit 1
fi

echo
echo "Checking production settings…"

DATABASE_URL_VALUE="$(env_value DATABASE_URL || true)"
if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL is missing. Run npm run setup first."
  exit 1
fi
if [[ "$DATABASE_URL_VALUE" =~ (localhost|127\.0\.0\.1|\[::1\]) ]]; then
  echo "DATABASE_URL points to localhost. Use your hosted PostgreSQL (Neon) URL before deploying."
  exit 1
fi

SMTP_USER_VALUE="$(env_value SMTP_USER || true)"
SMTP_PASSWORD_VALUE="$(env_value SMTP_APP_PASSWORD || true)"
SMTP_PASSWORD_VALUE="${SMTP_PASSWORD_VALUE// /}"
if [[ -z "$SMTP_USER_VALUE" || "$SMTP_USER_VALUE" == "your.email@gmail.com" ]]; then
  echo "Set a real SMTP_USER Gmail address before deploying."
  exit 1
fi
if [[ -z "$SMTP_PASSWORD_VALUE" || "$SMTP_PASSWORD_VALUE" == "local-dev-placeholder-16" ]]; then
  echo "Production email needs a real Gmail App Password, not the local test placeholder."
  echo "Run npm run setup again and paste the 16-character App Password."
  exit 1
fi
if [[ "${#SMTP_PASSWORD_VALUE}" -ne 16 ]]; then
  echo "SMTP_APP_PASSWORD must be the 16-character Gmail App Password."
  exit 1
fi

NEXTAUTH_SECRET_VALUE="$(env_value NEXTAUTH_SECRET || true)"
CRON_SECRET_VALUE="$(env_value CRON_SECRET || true)"
if [[ "${#NEXTAUTH_SECRET_VALUE}" -lt 32 ]]; then
  echo "NEXTAUTH_SECRET is missing or too short. Run npm run setup again."
  exit 1
fi
if [[ "${#CRON_SECRET_VALUE}" -lt 16 || "$CRON_SECRET_VALUE" == replace-with-* ]]; then
  echo "CRON_SECRET is missing or still a placeholder. Run npm run setup again."
  exit 1
fi

echo "Settings look good."
echo
echo "Pushing environment variables to Vercel Production…"

while IFS= read -r rawLine || [[ -n "$rawLine" ]]; do
  line="${rawLine%$'\r'}"
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"
  key="${key//[[:space:]]/}"
  [[ -z "$key" ]] && continue

  if [[ "$value" =~ ^\".*\"$ ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  if [[ "$key" == "NEXTAUTH_URL" || "$key" == "NEXT_PUBLIC_APP_URL" ]]; then
    value="$APP_URL"
  fi

  echo "  - $key"
  "${VERCEL[@]}" env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | "${VERCEL[@]}" env add "$key" production >/dev/null
done < .env

echo
echo "Deploying to production…"
"${VERCEL[@]}" --prod

echo
echo "Deployed. Open: $APP_URL"
