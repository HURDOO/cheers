#!/bin/sh
set -eu

measurement_id=${GA_MEASUREMENT_ID:-}
if [ -n "$measurement_id" ] && ! printf '%s' "$measurement_id" | grep -Eq '^G-[A-Z0-9]+$'; then
  echo 'GA_MEASUREMENT_ID must be a GA4 measurement ID (G-...).' >&2
  exit 1
fi

printf 'window.__CHEERS_GA_MEASUREMENT_ID__ = "%s";\n' "$measurement_id" \
  > /usr/share/nginx/html/analytics-config.js

exec nginx -g 'daemon off;'
