#!/bin/sh
# Pruebas en Chromium REAL del traspaso de "una sola sesion a la vez" (nube de Supabase FALSA).
# No corren en CI. Uso: sh scripts/e2e-sesion/run.sh [scen1 scen3 ...]   (sin argumentos: scen1 scen3 scen6 scen7 scen9)
# Requiere: python3 + playwright con Chromium, openssl y `npm install` hecho.
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
node scripts/check-i18n.mjs >/dev/null && node scripts/build.mjs >/dev/null
rm -rf /tmp/ext/propio-bridge && mkdir -p /tmp/ext /tmp/repro
node scripts/build-extension.mjs /tmp/ext/propio-bridge >/dev/null
if [ ! -f /tmp/repro/c.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/repro/k.pem -out /tmp/repro/c.pem -days 30 \
    -subj "/CN=ccqlvcrsoluxoymuhxnl.supabase.co" -addext "subjectAltName=DNS:ccqlvcrsoluxoymuhxnl.supabase.co" >/dev/null 2>&1
fi
cd scripts/e2e-sesion
[ $# -gt 0 ] || set -- scen1 scen3 scen6 scen7 scen9
for s in "$@"; do
  echo "=== $s"
  timeout 280 python3 "$s.py" 2>&1 | grep -E "^\[" | cut -c1-230 | tail -14
done
rm -rf __pycache__
