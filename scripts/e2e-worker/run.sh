#!/bin/sh
# Pruebas del worker en un Chromium REAL (Playwright para Python). Uso: sh scripts/e2e-worker/run.sh [A B C E F G]
# Antes: node scripts/check-i18n.mjs && node scripts/build.mjs && node scripts/build-extension.mjs /tmp/ext/propio-bridge
export CERT_DIR=/tmp/e2e EXT_DIR=${EXT_DIR:-/tmp/ext/propio-bridge}
mkdir -p $CERT_DIR
[ -f $CERT_DIR/cert.pem ] || openssl req -x509 -newkey rsa:2048 -nodes -keyout $CERT_DIR/key.pem -out $CERT_DIR/cert.pem -days 2 -subj "/CN=fake" 2>/dev/null
cd "$(dirname "$0")"
if [ $# -eq 0 ]; then set -- A B C F E G; fi
for s in "$@"; do
  timeout 200 python3 scen.py $s > $CERT_DIR/out_$s.log 2>&1
  grep -E "PASA|FALLA|RESULTADO" $CERT_DIR/out_$s.log
done
