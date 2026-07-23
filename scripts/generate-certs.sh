#!/usr/bin/env bash
#
# Generate a self-signed TLS certificate/key pair for the proxy.
#
# Output goes to <root>/certs/ as proxy-cert.pem and proxy-key.pem.
# Override the subject Common Name (and the first SAN entry) with CN=...:
#
#   CN=proxy.example.com scripts/generate-certs.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

CERT_DIR="${CERT_DIR:-${ROOT_DIR}/certs}"
CERT_FILE="${CERT_DIR}/proxy-cert.pem"
KEY_FILE="${CERT_DIR}/proxy-key.pem"
CN="${CN:-localhost}"
DAYS="${DAYS:-3650}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "error: openssl is required but was not found in PATH" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -days "${DAYS}" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=DNS:${CN},DNS:localhost,IP:127.0.0.1"

chmod 600 "${KEY_FILE}"

echo "Generated self-signed certificate for CN=${CN} (valid ${DAYS} days):"
echo "  cert: ${CERT_FILE}"
echo "  key:  ${KEY_FILE}"
