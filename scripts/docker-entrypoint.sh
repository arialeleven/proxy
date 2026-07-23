#!/bin/sh
#
# Container entrypoint: when TLS is enabled and no certificate is mounted,
# generate a self-signed pair so the proxy starts out of the box. Mount your
# own PEM files (or point PROXY_TLS_CERT / PROXY_TLS_KEY at them) for production.
#
set -e

PROXY_TLS="${PROXY_TLS:-true}"
CERT="${PROXY_TLS_CERT:-/app/certs/proxy-cert.pem}"
KEY="${PROXY_TLS_KEY:-/app/certs/proxy-key.pem}"
CN="${PROXY_CN:-localhost}"

case "$(printf '%s' "$PROXY_TLS" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
      echo "[entrypoint] no certificate found, generating a self-signed pair (CN=${CN})..."
      mkdir -p "$(dirname "$CERT")" "$(dirname "$KEY")"
      openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$KEY" \
        -out "$CERT" \
        -days "${DAYS:-3650}" \
        -subj "/CN=${CN}" \
        -addext "subjectAltName=DNS:${CN},DNS:localhost,IP:127.0.0.1"
      chmod 600 "$KEY"
    fi
    ;;
  *)
    echo "[entrypoint] TLS disabled (PROXY_TLS=${PROXY_TLS})"
    ;;
esac

exec "$@"
