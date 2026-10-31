#!/bin/sh
# Writes /config.json from environment variables so one image serves every environment.
set -eu
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > /usr/share/nginx/html/config.json <<JSON
{
  "apiBaseUrl": "$(esc "${API_BASE_URL}")",
  "googleClientId": "$(esc "${GOOGLE_CLIENT_ID:-}")"
}
JSON
